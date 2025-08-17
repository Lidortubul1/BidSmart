// src/components/ProductEditor/ProductEditor.jsx
import { useEffect, useMemo, useState ,useRef } from "react";
import CustomModal from "../../components/CustomModal/CustomModal";
import { useAuth } from "../../auth/AuthContext";
import styles from "./productEditor.module.css"
import {
  getProductById,
  peUpdateProduct,
  uploadProductImage,
  removeProductImage,
  cancelProductSale,
} from "../../services/productApi";
import { fetchCategoriesWithSubs } from "../../services/categoriesApi";

export default function ProductEditor({ productId, onSaved, onCancel }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [cats, setCats] = useState([]);
  const [images, setImages] = useState([]);
  const [cancelling, setCancelling] = useState(false); // ⬅️ מצב ביטול בתהליך

  // ——— ערכי טופס ———
  const [product_name, setName] = useState("");
  const [description, setDesc] = useState("");
  const [category_id, setCat] = useState("");
  const [subcategory_id, setSub] = useState("");
  const [datePart, setDatePart] = useState(""); // YYYY-MM-DD (required)
  const [timePart, setTimePart] = useState(""); // HH:MM (required)
  const [endTime, setEndTime]   = useState(""); // HH:MM (required)

  // מע״מ
  const [priceMode, setPriceMode]   = useState("gross"); // 'gross' | 'net'
  const [priceGross, setPriceGross] = useState("");      // כולל מע״מ
  const [priceNet, setPriceNet]     = useState("");      // לפני מע״מ

  const subs = useMemo(
    () => cats.find(c => String(c.id) === String(category_id))?.subcategories || [],
    [cats, category_id]
  );


// מודאל גנרי
   const [modalOpen, setModalOpen] = useState(false);
   const [modalCfg, setModalCfg] = useState({
     title: "", message: "", confirmText: "", cancelText: "",
     extraButtonText: "", onConfirm: null, onCancel: null,
     hideClose: false, disableBackdropClose: false,
   });
   const autoCloseTimerRef = useRef(null);

   function showModal(cfg) {
     // מנקה טיימר קודם אם היה
   if (autoCloseTimerRef.current) {
       clearTimeout(autoCloseTimerRef.current);
       autoCloseTimerRef.current = null;
     }
     setModalCfg(prev => ({ ...prev, ...cfg }));
     setModalOpen(true);
   }
   function closeModal() {
     setModalOpen(false);
   }



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
      const isOwner = user?.role === "seller" && String(user?.id_number) === String(prod.seller_id_number);
      if (!isAdmin && !isOwner) {
        throw new Error("אין הרשאה לערוך מוצר זה");
      }

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
      }

      // end_time -> HH:MM
      if (prod.end_time) {
        const [hh, mm] = String(prod.end_time).split(":");
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

  // חסימה לעריכה אם לא למכירה
  const status = String(product.product_status || "").trim().toLowerCase();
  if (status === "sale") return <Box msg="המוצר נמכר – לא ניתן לערוך." />;
  if (status === "not sold" || status === "not_sold") return <Box msg="המוצר לא נמכר – אין טופס עריכה." />;

  // ——— תמונות ———
  async function onAddImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
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
  }
});
 return;
  }

  // ——— שמירה ———
  async function onSubmit(e) {
    e.preventDefault();

    // ולידציות חובה
    if (!product_name.trim()) return alert("שם מוצר חובה");
    if (!description.trim()) return alert("תיאור חובה");
    if (!category_id) return alert("יש לבחור קטגוריה");
    if (!subcategory_id) return alert("יש לבחור תת קטגוריה");
    if (!datePart) return alert("יש לבחור תאריך התחלה");
    if (!timePart) return alert("יש לבחור שעת התחלה");
    if (!endTime) return alert("יש לבחור זמן מכירה (HH:MM)");

    if (priceMode === "gross") {
      if (!priceGross) return alert("יש להזין מחיר כולל מע״מ");
      if (Number(priceGross) <= 0) return alert("מחיר כולל מע״מ חייב להיות גדול מאפס");
    } else {
      if (!priceNet) return alert("יש להזין מחיר לפני מע״מ");
      if (Number(priceNet) <= 0) return alert("מחיר לפני מע״מ חייב להיות גדול מאפס");
    }

    setSaving(true);
    try {
      const payload = {
        product_name,
        description,
        category_id,
        subcategory_id,
        start_date: `${datePart}T${timePart}`, // ISO ללא שניות
        end_time: `${endTime}:00`,             // HH:MM:SS
      };

      // לוגיקת מע״מ: price = מוצג ללקוח; current_price זהה; price_before_vat לפי חישוב
      if (priceMode === "gross") {
        const inc = Number(priceGross);
        const pre = +(inc / 1.17).toFixed(2);
        payload.price = inc;
        payload.current_price = inc;
        payload.price_before_vat = pre;
      } else {
        const pre = Number(priceNet);
        const inc = +(pre * 1.17).toFixed(2);
        payload.price_before_vat = pre;
        payload.price = inc;
        payload.current_price = inc;
      }

      await peUpdateProduct(productId, payload);
    // מודאל הצלחה שננעל (ללא כפתורים) ונסגר לבד אחרי שנייה
  showModal({
    title: "בוצע",
    message: "השינויים נשמרו בהצלחה",
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
    message: "שגיאה בשמירה",
    confirmText: "סגור",
    onConfirm: () => closeModal(),
  });    } finally {
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

        // הצלחה
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



    const canCancelSale = String(product?.product_status || "").toLowerCase() === "for sale";



  return (
    <>
    <form onSubmit={onSubmit} className={styles.editor}>
      <h2 className={styles.header}>עריכת מוצר</h2>

      <Row label="שם מוצר">
        <input required value={product_name} onChange={(e) => setName(e.target.value)} />
      </Row>

      <Row label="תיאור">
        <textarea required value={description} onChange={(e) => setDesc(e.target.value)} rows={4} />
      </Row>

      <Row label="קטגוריה">
        <select required value={category_id} onChange={(e) => { setCat(e.target.value); setSub(""); }}>
          <option value="">בחר קטגוריה</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Row>

      <Row label="תת קטגוריה">
        <select required value={subcategory_id} onChange={(e) => setSub(e.target.value)} disabled={!category_id}>
          <option value="">בחר תת־קטגוריה</option>
          {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Row>

      <Row label="תאריך התחלה">
        <input required type="date" value={datePart} onChange={(e) => setDatePart(e.target.value)} />
      </Row>

      <Row label="שעת התחלה">
        <input required type="time" value={timePart} onChange={(e) => setTimePart(e.target.value)} />
      </Row>

      <Row label="זמן מכירה (HH:MM)">
        <input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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

      {/* תמונות */}
      <div style={{ margin: "20px 0 8px", fontWeight: 600 }}>תמונות מוצר</div>
      <label className={styles.addImgLabel}>
        הוסף תמונה
        <input type="file" accept="image/*" onChange={onAddImage} style={{ display: "none" }} />
      </label>

      {images?.length ? (
        <div className={styles.imagesGrid}>
          {images.map((img, i) => {
            const url = typeof img === "string" ? `${base}${img}` : `${base}${img.image_url || ""}`;
            const raw = typeof img === "string" ? img : (img.image_url || "");
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

      <div className={styles.actions}>
        <button type="submit" className={styles.primaryBtn} disabled={saving}>
          {saving ? "שומר..." : "שמור שינויים"}
        </button>
        {onCancel && (
          <button type="button" className={styles.primaryBtn} onClick={onCancel}>
            חזרה לדף ניהול מוצרים
          </button>
        )}

         {canCancelSale && (
          <button
            type="button"
            className={styles.primaryBtn}     // ⬅️ עיצוב אדום
            onClick={onCancelSaleClick}
            disabled={cancelling}
            title="ביטול מכירה – משנה סטטוס ל-blocked ומוחק הצעות"
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
        onClose={() => closeModal()}     // ← סגירת מודאל בלבד, בלי להריץ onCancel
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
    <div style={{
      padding: 16, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff",
      maxWidth: 640, margin: "16px auto", textAlign: "center"
    }}>
      {msg}
    </div>
  );
}
