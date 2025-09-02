import { useEffect, useMemo, useState } from "react";
import CustomModal from "../../../components/CustomModal/CustomModal";
import { useAuth } from "../../../auth/AuthContext";
import styles from "./productEditor.module.css";
import {
  getProductById,
  peUpdateProduct,
  peRelistProduct,
  cancelProductSale,
} from "../../../services/productApi";
import { fetchCategoriesWithSubs } from "../../../services/categoriesApi";

// מסך "כמו לזוכה" בלי כפתור תשלום
import OwnerUnpaidSection from "./OwnerUnpaidSection";

// utils & hooks חדשים
import { todayStr, nowTimeStr } from "../utils/datetime";


import { BID_STEPS } from "../utils/constants";
import useModal from "../hooks/useModal";
import useImagesManager from "../hooks/useImagesManager";
import { buildPayload, validateRequired } from "../utils/editorForm";

export default function ProductEditor({ productId, onSaved, onCancel }) {
  const { user } = useAuth();

  // מודאל
  const { modalOpen, modalCfg, showModal, closeModal, autoCloseTimerRef } = useModal();

  // דאטה ליבה
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [cats, setCats] = useState([]);
  const [cancelling, setCancelling] = useState(false);

  // רליסט
  const [relistMode, setRelistMode] = useState(false);

  // שדות טופס
  const [product_name, setName] = useState("");
  const [description, setDesc] = useState("");
  const [category_id, setCat] = useState("");
  const [subcategory_id, setSub] = useState("");
  const [datePart, setDatePart] = useState("");
  const [timePart, setTimePart] = useState("");
  const [endTime, setEndTime] = useState("");

  const [priceMode, setPriceMode] = useState("gross");
  const [priceGross, setPriceGross] = useState("");
  const [priceNet, setPriceNet] = useState("");

  const [bidIncrement, setBidIncrement] = useState(10);

  // תמונות – מנוהל ע"י הוק
  const {
    images,
    setImages,
    pendingImages,
    onAddImage,
    removePendingImage,
    onDeleteImage,
  } = useImagesManager({
    productId,
    relistMode,
    refreshProduct: async () => {
      const refreshed = await getProductById(productId);
      setProduct(refreshed);
      setImages(refreshed.images || []);
    },
    onError: (message) =>
      showModal({
        title: "שגיאה",
        message,
        confirmText: "סגור",
        onConfirm: () => closeModal(),
      }),
  });

  // תתי־קטגוריות נגזרות
  const subs = useMemo(
    () => cats.find((c) => String(c.id) === String(category_id))?.subcategories || [],
    [cats, category_id]
  );

  // טעינה ראשונית
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [prod, catsRes] = await Promise.all([
        getProductById(productId),
        fetchCategoriesWithSubs(),
      ]);
      setProduct(prod);
      setCats(catsRes);

      // הרשאה: אדמין או המוכר בלבד
      const isAdmin = user?.role === "admin";
      const isOwner =
        user?.role === "seller" && String(user?.id_number) === String(prod.seller_id_number);
      if (!isAdmin && !isOwner) throw new Error("אין הרשאה לערוך מוצר זה");

      // רליסט?
      const st = String(prod.product_status || "").trim().toLowerCase();
      setRelistMode(st === "not sold" || st === "not_sold");

      // שדות טופס
      setName(prod.product_name || "");
      setDesc(prod.description || "");
      setCat(prod.category_id || "");
      setSub(prod.subcategory_id || "");

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

      if (prod.end_time) {
        const [hh = "00", mm = "00"] = String(prod.end_time).split(":");
        setEndTime(`${hh}:${mm}`);
      }

      const gross = prod.price ?? "";
      const net = prod.price_before_vat ?? (prod.price ? +(Number(prod.price) / 1.17).toFixed(2) : "");
      setPriceMode("gross");
      setPriceGross(gross !== null ? String(gross) : "");
      setPriceNet(net !== null ? String(net) : "");

      setImages(Array.isArray(prod.images) ? prod.images : []);
      setBidIncrement(() => {
        const initial = Number(prod.bid_increment ?? 10);
        return BID_STEPS.includes(initial) ? initial : 10;
      });

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
  }, [productId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div style={{ padding: 16 }}>טוען...</div>;
  if (!product) return null;

  // סטטוסים כלליים
  const statusRaw = String(product?.product_status || "").trim().toLowerCase();
  const winnerExists = !!product?.winner_id_number;

  const canCancelSale =
    !relistMode && (statusRaw === "for sale" || statusRaw === "for_sale");

  // חסימות
  if (statusRaw === "blocked") {
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
  if (statusRaw === "admin blocked") {
    return (
      <Box
        msg={
          <>
            <div>המוצר נחסם – לא ניתן לערוך.</div>
            <div style={{ marginTop: 6 }}>
              ההנהלה חסמה את המוצר- <b>{product.product_name || " "}</b> פנה למוקד התמיכה לבירור הפרטים
            </div>
          </>
        }
      />
    );
  }
  if (statusRaw === "sale") {
    return <Box msg="המוצר נמכר – לא ניתן לערוך." />;
  }

  // למוכר – תצוגת "כמו לזוכה" כשיש זוכה שלא שילם
  if ((statusRaw === "for sale" || statusRaw === "for_sale") && winnerExists) {
    return <OwnerUnpaidSection product={product} />;
  }

  // שליחה/מחיקה – כבר בתוך useImagesManager

  // שמירה / רליסט
  async function onSubmit(e) {
    e.preventDefault();

    const errMsg = validateRequired(
      {
        product_name,
        description,
        category_id,
        subcategory_id,
        datePart,
        timePart,
        endTime,
        priceMode,
        priceGross,
        priceNet,
        bidIncrement,
      },
      BID_STEPS
    );
    if (errMsg) {
      alert(errMsg);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload({
        product_name,
        description,
        category_id,
        subcategory_id,
        datePart,
        timePart,
        endTime,
        priceMode,
        priceGross,
        priceNet,
        bidIncrement,
      });

      if (relistMode) {
        const res = await peRelistProduct(productId, { ...payload, copy_images: true });
        const newId = res?.new_product_id;
        if (!newId) throw new Error("Relist succeeded but new_product_id is missing");
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

  const minDate = todayStr();
  const minTime = datePart === todayStr() ? nowTimeStr() : undefined;

  const headerTitle = relistMode
    ? (winnerExists ? "פרסום מחדש — הרוכש לא שילם" : "פרסום מחדש (הוספת מוצר חדש)")
    : "עריכת מוצר";

  return (
    <>
      <form onSubmit={onSubmit} className={styles.editor}>
        <h2 className={styles.header}>{headerTitle}</h2>

        <Row label="שם מוצר">
          <input required value={product_name} onChange={(e) => setName(e.target.value)} />
        </Row>

        <Row label="תיאור">
          <textarea required value={description} onChange={(e) => setDesc(e.target.value)} rows={4} />
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
          <select required value={subcategory_id} onChange={(e) => setSub(e.target.value)} disabled={!category_id}>
            <option value="">בחר תת־קטגוריה</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Row>

        <Row label="תאריך התחלה">
          <input required type="date" value={datePart} onChange={(e) => setDatePart(e.target.value)} min={minDate} />
        </Row>

        <Row label="שעת התחלה">
          <input required type="time" value={timePart} onChange={(e) => setTimePart(e.target.value)} min={minTime} />
        </Row>

        <Row label="זמן מכירה (HH:MM)">
          <input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </Row>

        <div className={styles.formRow}>
          <label>תמחור</label>
          <div className={styles.segmented}>
            <button type="button" className={priceMode === "gross" ? styles.on : undefined} onClick={() => setPriceMode("gross")}>
              כולל מע״מ
            </button>
            <button type="button" className={priceMode === "net" ? styles.on : undefined} onClick={() => setPriceMode("net")}>
              לפני מע״מ
            </button>
          </div>
        </div>

        {priceMode === "gross" ? (
          <Row label="מחיר (כולל מע״מ)">
            <div>
              <input required type="number" step="0.01" value={priceGross} onChange={(e) => setPriceGross(e.target.value)} />
              <small className={styles.hint}>לפני מע״מ: {priceGross ? (Number(priceGross) / 1.17).toFixed(2) : "-"}</small>
            </div>
          </Row>
        ) : (
          <Row label="מחיר (לפני מע״מ)">
            <div>
              <input required type="number" step="0.01" value={priceNet} onChange={(e) => setPriceNet(e.target.value)} />
              <small className={styles.hint}>כולל מע״מ: {priceNet ? (Number(priceNet) * 1.17).toFixed(2) : "-"}</small>
            </div>
          </Row>
        )}

        <Row label="סכום עליית הצעה">
          <select required value={bidIncrement} onChange={(e) => setBidIncrement(Number(e.target.value))}>
            {BID_STEPS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Row>

        {/* תמונות */}
        <div style={{ margin: "20px 0 8px", fontWeight: 600 }}>תמונות מוצר</div>
        <label className={styles.addImgLabel}>
          הוסף תמונה
          <input type="file" accept="image/*" onChange={onAddImage} style={{ display: "none" }} />
        </label>

        {images?.length ? (
          <div className={styles.imagesGrid}>
            {images.map((img, i) => {
              const base = "http://localhost:5000";
              const url = typeof img === "string" ? `${base}${img}` : `${base}${img.image_url || ""}`;
              const raw = typeof img === "string" ? img : img.image_url || "";
              return (
                <div key={i} className={styles.imageItem}>
                  <img src={url} alt="" />
                  <button type="button" className={styles.deleteImgBtn} onClick={() => onDeleteImage(raw)} title="מחק">
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
            <div style={{ marginTop: 12, fontWeight: 600 }}>תמונות חדשות (יתווספו אחרי פרסום מחדש)</div>
            <div className={styles.imagesGrid}>
              {pendingImages.map((file, i) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={i} className={styles.imageItem}>
                    <img src={url} alt="" onLoad={() => URL.revokeObjectURL(url)} />
                    <button type="button" className={styles.deleteImgBtn} onClick={() => removePendingImage(i)} title="מחק">
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
