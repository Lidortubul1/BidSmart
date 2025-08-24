// src/components/ProductEditor/ProductEditor.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import CustomModal from "../../components/CustomModal/CustomModal";
import { useAuth } from "../../auth/AuthContext";
import styles from "./productEditor.module.css";
import {
  getProductById,
  peUpdateProduct,
  peRelistProduct,        // 🆕 הוספה: יצירת מוצר חדש מתוך קיים (רליסט)
  uploadProductImage,
  removeProductImage,
  cancelProductSale,
} from "../../services/productApi";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";

/* ======================= עזרי זמן/תאריכים ======================= */

/** ISO → "DD/MM/YYYY בשעה HH:MM" בעברית */
function formatDateTimeHe(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("he-IL");
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${date} בשעה ${time}`;
}

/** תאריך היום בפורמט YYYY-MM-DD (ל־min בשדה date) */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** שעה נוכחית HH:MM (ל־min בשדה time כשנבחר היום) */
function nowTimeStr() {
  const d = new Date();
  d.setSeconds(0);
  d.setMilliseconds(0);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/* ======================= קומפוננטה ======================= */

export default function ProductEditor({ productId, onSaved, onCancel }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [cats, setCats] = useState([]);
  const [images, setImages] = useState([]);
  const [cancelling, setCancelling] = useState(false);

  // ערכי עליית הצעה מותרים בלבד
  const BID_STEPS = [10, 20, 50, 100, 500, 1000];

  // סטייט לסכום עליית הצעה
  const [bidIncrement, setBidIncrement] = useState(() => {
    const initial = Number(product?.bid_increment ?? 10);
    return BID_STEPS.includes(initial) ? initial : 10;
  });
  useEffect(() => {
    if (!product) return;
    const initial = Number(product.bid_increment ?? 10);
    setBidIncrement(BID_STEPS.includes(initial) ? initial : 10);
  }, [product]);

  // מצב רליסט (פרסום מחדש)
  const [relistMode, setRelistMode] = useState(false);

  // ——— ערכי טופס ———
  const [product_name, setName] = useState("");
  const [description, setDesc] = useState("");
  const [category_id, setCat] = useState("");
  const [subcategory_id, setSub] = useState("");
  const [datePart, setDatePart] = useState(""); // YYYY-MM-DD
  const [timePart, setTimePart] = useState(""); // HH:MM
  const [endTime, setEndTime] = useState("");   // HH:MM

  // מע״מ
  const [priceMode, setPriceMode] = useState("gross"); // 'gross' | 'net'
  const [priceGross, setPriceGross] = useState("");    // כולל מע״מ
  const [priceNet, setPriceNet] = useState("");        // לפני מע״מ

  // תמונות שמחכות ל־Relist
  const [pendingImages, setPendingImages] = useState([]); // File[]

  // נגזרות
  const subs = useMemo(
    () => cats.find((c) => String(c.id) === String(category_id))?.subcategories || [],
    [cats, category_id]
  );

  // מודאל גנרי
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCfg, setModalCfg] = useState({
    title: "",
    message: "",
    confirmText: "",
    cancelText: "",
    extraButtonText: "",
    onConfirm: null,
    onCancel: null,
    hideClose: false,
    disableBackdropClose: false,
  });
  const autoCloseTimerRef = useRef(null);

  function showModal(cfg) {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setModalCfg((prev) => ({ ...prev, ...cfg }));
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
  }

  /* ======================= טעינה ראשונית ======================= */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [prod, catsRes] = await Promise.all([
        getProductById(productId),
        fetchCategoriesWithSubs(),
      ]);
      setProduct(prod);
      setCats(catsRes);

      // הרשאה: רק אדמין או המוכר של המוצר
      const isAdmin = user?.role === "admin";
      const isOwner =
        user?.role === "seller" && String(user?.id_number) === String(prod.seller_id_number);
      if (!isAdmin && !isOwner) {
        throw new Error("אין הרשאה לערוך מוצר זה");
      }

      // קביעה אם זה מצב רליסט (not sold)
      const st = String(prod.product_status || "").trim().toLowerCase();
      setRelistMode(st === "not sold" || st === "not_sold");

      // איפוס טופס
      setName(prod.product_name || "");
      setDesc(prod.description || "");
      setCat(prod.category_id || "");
      setSub(prod.subcategory_id || "");

      // start_date -> date/time
      if (prod.start_date) {
        const d = new Date(prod.start_date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setDatePart(`${y}-${m}-${day}`);
        setTimePart(`${hh}:${mm}`);
      } else {
        setDatePart(todayStr());
        setTimePart(nowTimeStr());
      }

      // end_time -> HH:MM
      if (prod.end_time) {
        const [hh = "00", mm = "00"] = String(prod.end_time).split(":");
        setEndTime(`${hh}:${mm}`);
      }

      // מחירים
      const gross = prod.price ?? "";
      const net =
        prod.price_before_vat ??
        (prod.price ? +(Number(prod.price) / 1.17).toFixed(2) : "");
      setPriceMode("gross");
      setPriceGross(gross !== null ? String(gross) : "");
      setPriceNet(net !== null ? String(net) : "");

      // תמונות
      const imgs = Array.isArray(prod.images) ? prod.images : [];
      setImages(imgs);

      setLoading(false);
    })().catch((e) => {
      console.error(e);
      showModal({
        title: "שגיאה",
        message: e.message || "שגיאה בטעינה",
        confirmText: "סגור",
        onConfirm: () => closeModal(),
      });
      setLoading(false);
    });
  }, [productId, user]);

  if (loading) return <div style={{ padding: 16 }}>טוען...</div>;
  if (!product) return null;

  /* ======================= חסימות לפי סטטוס כללי ======================= */
  const status = String(product.product_status || "").trim().toLowerCase();
  const winnerExists = !!product?.winner_id_number;

  // ✅ הודעה כללית כשהמוצר חסום (בלי להבחין מי חסם/מה הסיבה)
  if (status === "blocked") {
    return (
      <Box
        msg={
          <>
            <div>המוצר נחסם – לא ניתן לערוך.</div>
            <div style={{ marginTop: 6 }}>
              .אם לא חסמת את המוצר, סיבת החסימה נשלחה למייל שאיתו נרשמת לאתר
            </div>
          </>
        }
      />
    );
  }

  // נמכר סופית — אין עריכה
  if (status === "sale") {
    return <Box msg="המוצר נמכר – לא ניתן לערוך." />;
  }

  // יש זוכה והמוצר עדיין for_sale — הזוכה טרם שילם
  if ((status === "for sale" || status === "for_sale") && winnerExists) {
    const lastTs = product?.last_bid_time ? new Date(product.last_bid_time).getTime() : null;
    const deadlineTs = lastTs ? lastTs + 24 * 60 * 60 * 1000 : null;
    const deadlineText = deadlineTs ? formatDateTimeHe(new Date(deadlineTs).toISOString()) : "—";

    return (
      <Box
        msg={
          <>
            <div>יש זוכה למוצר אך הוא טרם שילם.</div>
            <div>
              באפשרותו להשלים תשלום עד: <b>{deadlineText}</b>.
            </div>
            <div>
              אם לא ישלם עד מועד זה, המוצר ייחשב כ<strong>לא נמכר</strong> ותוכל/י לפרסם מחדש.
            </div>
          </>
        }
      />
    );
  }

  /* ======================= העלאה/מחיקה של תמונות ======================= */

  async function onAddImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // במצב Relist – לא מעלים עכשיו ל-ID הישן!
    if (relistMode) {
      setPendingImages((prev) => [...prev, file]);
      e.target.value = "";
      return;
    }

    // עריכה רגילה (for sale)
    try {
      await uploadProductImage(productId, file);
      const refreshed = await getProductById(productId);
      setProduct(refreshed);
      setImages(refreshed.images || []);
      e.target.value = "";
    } catch (err) {
      console.error(err);
      showModal({
        title: "שגיאה",
        message: "שגיאה בהעלאת תמונה",
        confirmText: "סגור",
        onConfirm: () => closeModal(),
      });
    }
  }
  function removePendingImage(idx) {
    setPendingImages(prev => prev.filter((_, i) => i !== idx));
  }

  async function onDeleteImage(imageUrl) {
    showModal({
      title: "מחיקת תמונה",
      message: "למחוק את התמונה?",
      cancelText: "ביטול",
      confirmText: "מחק",
      onCancel: () => closeModal(),
      onConfirm: async () => {
        closeModal();
        try {
          await removeProductImage(productId, imageUrl);
          const refreshed = await getProductById(productId);
          setProduct(refreshed);
          setImages(refreshed.images || []);
        } catch (err) {
          console.error(err);
          showModal({
            title: "שגיאה",
            message: "שגיאה במחיקת תמונה",
            confirmText: "סגור",
            onConfirm: () => closeModal(),
          });
        }
      },
    });
    return;
  }

  /* ======================= שמירה / פרסום מחדש ======================= */

  function buildPayload() {
    const payload = {
      product_name,
      description,
      category_id,
      subcategory_id,
      start_date: `${datePart}T${timePart}`,
      end_time: `${endTime}:00`,
    };

    if (priceMode === "gross") {
      const inc = Number(priceGross);
      const pre = +(inc / 1.17).toFixed(2);
      payload.price = inc;
      payload.current_price = inc;
      payload.price_before_vat = pre;
      payload.vat_included = "true";
    } else {
      const pre = Number(priceNet);
      const inc = +(pre * 1.17).toFixed(2);
      payload.price_before_vat = pre;
      payload.price = inc;
      payload.current_price = inc;
      payload.vat_included = "false";
    }

    payload.vat_included = (priceMode === "gross") ? "true" : "false";
    payload.bid_increment = Number(bidIncrement) || 10;

    return payload;
  }

  function validateRequired() {
    if (!product_name.trim()) return "שם מוצר חובה";
    if (!description.trim()) return "תיאור חובה";
    if (!category_id) return "יש לבחור קטגוריה";
    if (!subcategory_id) return "יש לבחור תת־קטגוריה";
    if (!datePart) return "יש לבחור תאריך התחלה";
    if (!timePart) return "יש לבחור שעת התחלה";
    if (!endTime) return "יש לבחור זמן מכירה (HH:MM)";

    if (priceMode === "gross") {
      if (!priceGross) return "יש להזין מחיר כולל מע״מ";
      if (Number(priceGross) <= 0) return "מחיר כולל מע״מ חייב להיות גדול מאפס";
    } else {
      if (!priceNet) return "יש להזין מחיר לפני מע״מ";
      if (Number(priceNet) <= 0) return "מחיר לפני מע״מ חייב להיות גדול מאפס";
    }
    if (!BID_STEPS.includes(Number(bidIncrement))) {
      return `סכום עליית הצעה חייב להיות אחד מהבאים: ${BID_STEPS.join("/")}`;
    }

    const startIso = `${datePart}T${timePart}:00`;
    const startMs = new Date(startIso).getTime();
    const nowMs = Date.now();
    if (!Number.isFinite(startMs)) return "תאריך/שעת התחלה לא תקינים";
    if (startMs < nowMs) return "תאריך/שעת התחלה לא יכולים להיות בעבר";

    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();

    const errMsg = validateRequired();
    if (errMsg) {
      alert(errMsg);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();

      if (relistMode) {
        const res = await peRelistProduct(productId, {
          ...payload,
          copy_images: true,
        });

        const newId = res?.new_product_id;
        if (!newId) throw new Error("Relist succeeded but new_product_id is missing");

        if (pendingImages.length) {
          for (const f of pendingImages) {
            await uploadProductImage(newId, f);
          }
        }
      } else {
        await peUpdateProduct(productId, payload);
      }

      showModal({
        title: "בוצע",
        message: relistMode ? "המוצר פורסם מחדש בהצלחה" : "השינויים נשמרו בהצלחה",
        hideClose: true,
        disableBackdropClose: true,
      });
      autoCloseTimerRef.current = setTimeout(() => {
        closeModal();
        onSaved?.();
      }, 1000);
    } catch (err) {
      console.error(err);
      showModal({
        title: "שגיאה",
        message: relistMode ? "שגיאה בפרסום מחדש" : "שגיאה בשמירה",
        confirmText: "סגור",
        onConfirm: () => closeModal(),
      });
    } finally {
      setSaving(false);
    }
  }

  const base = "http://localhost:5000";

  async function onCancelSaleClick() {
    showModal({
      title: "אישור ביטול מכירה",
      message: "האם לבטל את המכירה? כל ההרשמות/הצעות יימחקו ותישלח הודעה למשתתפים.",
      cancelText: "ביטול",
      confirmText: "כן, בטל מכירה זו",
      disableBackdropClose: true,
      onCancel: () => closeModal(),
      onConfirm: async () => {
        closeModal();
        try {
          setCancelling(true);
          await cancelProductSale(productId);
          showModal({
            title: "בוצע",
            message: "המכירה בוטלה. המשתתפים יקבלו עדכון במייל.",
            confirmText: "סגור",
            onConfirm: () => {
              closeModal();
              onSaved?.();
            },
          });
        } catch (e) {
          console.error(e);
          showModal({
            title: "שגיאה",
            message: "שגיאה בביטול המכירה",
            confirmText: "סגור",
            onConfirm: () => closeModal(),
          });
        } finally {
          setCancelling(false);
        }
      },
    });
  }

  // כפתור ביטול מכירה יוצג רק כשהסטטוס For Sale (בעריכה רגילה)
  const canCancelSale =
    !relistMode && String(product?.product_status || "").toLowerCase() === "for sale";

  /* ======================= UI ======================= */

  const minDate = todayStr();
  const minTime = datePart === todayStr() ? nowTimeStr() : undefined;

  return (
    <>
      <form onSubmit={onSubmit} className={styles.editor}>
        <h2 className={styles.header}>
          {relistMode ? "פרסום מחדש (הוספת מוצר חדש)" : "עריכת מוצר"}
        </h2>

        <Row label="שם מוצר">
          <input required value={product_name} onChange={(e) => setName(e.target.value)} />
        </Row>

        <Row label="תיאור">
          <textarea
            required
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
          />
        </Row>

        <Row label="קטגוריה">
          <select
            required
            value={category_id}
            onChange={(e) => {
              setCat(e.target.value);
              setSub("");
            }}
          >
            <option value="">בחר קטגוריה</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="תת קטגוריה">
          <select
            required
            value={subcategory_id}
            onChange={(e) => setSub(e.target.value)}
            disabled={!category_id}
          >
            <option value="">בחר תת־קטגוריה</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="תאריך התחלה">
          <input
            required
            type="date"
            value={datePart}
            onChange={(e) => setDatePart(e.target.value)}
            min={minDate}
          />
        </Row>

        <Row label="שעת התחלה">
          <input
            required
            type="time"
            value={timePart}
            onChange={(e) => setTimePart(e.target.value)}
            min={minTime}
          />
        </Row>

        <Row label="זמן מכירה (HH:MM)">
          <input
            required
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </Row>

        <div className={styles.formRow}>
          <label>תמחור</label>
          <div className={styles.segmented}>
            <button
              type="button"
              className={priceMode === "gross" ? styles.on : undefined}
              onClick={() => setPriceMode("gross")}
            >
              כולל מע״מ
            </button>
            <button
              type="button"
              className={priceMode === "net" ? styles.on : undefined}
              onClick={() => setPriceMode("net")}
            >
              לפני מע״מ
            </button>
          </div>
        </div>

        {priceMode === "gross" ? (
          <Row label="מחיר (כולל מע״מ)">
            <div>
              <input
                required
                type="number"
                step="0.01"
                value={priceGross}
                onChange={(e) => setPriceGross(e.target.value)}
              />
              <small className={styles.hint}>
                לפני מע״מ: {priceGross ? (Number(priceGross) / 1.17).toFixed(2) : "-"}
              </small>
            </div>
          </Row>
        ) : (
          <Row label="מחיר (לפני מע״מ)">
            <div>
              <input
                required
                type="number"
                step="0.01"
                value={priceNet}
                onChange={(e) => setPriceNet(e.target.value)}
              />
              <small className={styles.hint}>
                כולל מע״מ: {priceNet ? (Number(priceNet) * 1.17).toFixed(2) : "-"}
              </small>
            </div>
          </Row>
        )}

        <Row label="סכום עליית הצעה">
          <select
            required
            value={bidIncrement}
            onChange={(e) => setBidIncrement(Number(e.target.value))}
          >
            {BID_STEPS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </Row>

        {/* תמונות */}
        <div style={{ margin: "20px 0 8px", fontWeight: 600 }}>תמונות מוצר</div>
        <label className={styles.addImgLabel}>
          הוסף תמונה
          <input
            type="file"
            accept="image/*"
            onChange={onAddImage}
            style={{ display: "none" }}
          />
        </label>

        {images?.length ? (
          <div className={styles.imagesGrid}>
            {images.map((img, i) => {
              const url =
                typeof img === "string"
                  ? `${base}${img}`
                  : `${base}${img.image_url || ""}`;
              const raw = typeof img === "string" ? img : img.image_url || "";
              return (
                <div key={i} className={styles.imageItem}>
                  <img src={url} alt="" />
                  <button
                    type="button"
                    className={styles.deleteImgBtn}
                    onClick={() => onDeleteImage(raw)}
                    title="מחק"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#888" }}>אין תמונות</div>
        )}

        {relistMode && pendingImages.length > 0 && (
          <>
            <div style={{ marginTop: 12, fontWeight: 600 }}>
              תמונות חדשות (יתווספו אחרי פרסום מחדש)
            </div>
            <div className={styles.imagesGrid}>
              {pendingImages.map((file, i) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={i} className={styles.imageItem}>
                    <img src={url} alt="" onLoad={() => URL.revokeObjectURL(url)} />
                    <button
                      type="button"
                      className={styles.deleteImgBtn}
                      onClick={() => removePendingImage(i)}
                      title="מחק"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryBtn} disabled={saving}>
            {saving ? (relistMode ? "מפרסם..." : "שומר...") : relistMode ? "פרסם מחדש" : "שמור שינויים"}
          </button>

          {onCancel && (
            <button type="button" className={styles.primaryBtn} onClick={onCancel}>
              חזרה לדף ניהול מוצרים
            </button>
          )}

          {canCancelSale && (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onCancelSaleClick}
              disabled={cancelling}
              title="ביטול מכירה – משנה סטטוס ומוחק הצעות"
            >
              {cancelling ? "מבטל..." : "בטל מכירה זו"}
            </button>
          )}
        </div>
      </form>

      {modalOpen && (
        <CustomModal
          title={modalCfg.title}
          message={modalCfg.message}
          confirmText={modalCfg.confirmText}
          cancelText={modalCfg.cancelText}
          extraButtonText={modalCfg.extraButtonText}
          onConfirm={modalCfg.onConfirm}
          onCancel={modalCfg.onCancel || (() => closeModal())}
          onExtra={modalCfg.onExtra}
          onClose={() => closeModal()}
          hideClose={modalCfg.hideClose}
          disableBackdropClose={modalCfg.disableBackdropClose}
        />
      )}
    </>
  );
}

/* ======================= רכיבי עזר ל־UI ======================= */

function Row({ label, children }) {
  return (
    <div className={styles.formRow}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function Box({ msg }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#fff",
        maxWidth: 640,
        margin: "16px auto",
        textAlign: "center",
      }}
    >
      {msg}
    </div>
  );
}
