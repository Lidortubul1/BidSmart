import { useState } from "react";
import AdminUsersList from "./AdminUsersList";
import styles from "./AdminUsers.module.css";

export default function AdminUsersPage() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className={styles.auPage_single}>
      <AdminUsersList
        selectedId={selectedId}
        onSelectUser={setSelectedId}
      />
    </div>
  );
}
