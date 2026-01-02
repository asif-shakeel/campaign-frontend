import { useEffect, useState } from "react";

const API_BASE = "https://campaign-core.onrender.com";
const M_API_KEY =
  "23de7892259eb741fffcb1d9a95d06ad96645b6bc2acff73fe85d157ddddb96f";

export default function App() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [newName, setNewName] = useState("");

  const [repliesCount, setRepliesCount] = useState(0);
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = campaigns.find(c => c.id === selectedId);

  const downloadRecipientMapCSV = async () => {
  if (!selectedId) return;

  const res = await fetch(
    `${API_BASE}/campaigns/${selectedId}/recipients.csv`,
    {
      headers: {
        "X-M-Key": M_API_KEY,
      },
    }
  );

  if (!res.ok) {
    alert("Failed to download recipient map");
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `campaign_${selectedId}_email_token_map.csv`;
  a.click();

  URL.revokeObjectURL(url);
};

const clearAllData = async () => {
  const ok = window.confirm(
    "⚠️ This will permanently delete ALL campaigns, recipients, and replies.\n\nThis cannot be undone."
  );
  if (!ok) return;

  const confirmText = prompt('Type "DELETE_ALL_DATA" to confirm');
  if (confirmText !== "DELETE_ALL_DATA") {
    alert("Confirmation failed. Nothing was deleted.");
    return;
  }

  const res = await fetch(`${API_BASE}/admin/clear-all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-M-Key": M_API_KEY,
    },
    body: JSON.stringify({ confirm: "DELETE_ALL_DATA" }),
  });

  if (!res.ok) {
    alert("Failed to clear data");
    return;
  }


  alert("All data cleared.");
  await loadCampaigns();

};


  // -------------------------------------------
  // Load campaigns
  // -------------------------------------------

const loadCampaigns = async () => {
  try {
    const res = await fetch(`${API_BASE}/campaigns`, {
      headers: { "X-M-Key": M_API_KEY },
    });
    if (!res.ok) throw new Error();

    const data = await res.json();

    // ✅ HARD RESET if backend is empty
    if (!data.length) {
      setCampaigns([]);
      setSelectedId("");
      setRepliesCount(0);
      setStatus("ready");
      return;
    }

    setCampaigns(
      data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    );
    setStatus("ready");
  } catch {
    setStatus("error");
  }
};

useEffect(() => {
  loadCampaigns();
}, []);

  // -------------------------------------------
  // Load replies count for selected campaign
  // -------------------------------------------

useEffect(() => {
  if (!selectedId) {
    setRepliesCount(0);
    return;
  }

  const load = () => {
    fetch(`${API_BASE}/replies?campaign_id=${selectedId}`, {
      headers: { "X-M-Key": M_API_KEY },
    })
      .then(res => res.json())
      .then(data => setRepliesCount(data.length))
      .catch(() => setRepliesCount(0));
  };

  load(); // initial
  const id = setInterval(load, 5000); // poll every 5s
  return () => clearInterval(id);
}, [selectedId]);


  // -------------------------------------------
  // Create campaign
  // -------------------------------------------

  const createCampaign = async () => {
    if (!newName.trim()) return;

    setBusy(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-M-Key": M_API_KEY,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) throw new Error();

      const created = await res.json();
      setCampaigns([created, ...campaigns]);
      setSelectedId(created.id);
      setNewName("");
    } catch {
      setError("Failed to create campaign");
    } finally {
      setBusy(false);
    }
  };

  const downloadRepliesCSV = async () => {
  if (!selectedId) return;

  const res = await fetch(
    `${API_BASE}/campaigns/${selectedId}/replies.csv`,
    {
      headers: {
        "X-M-Key": M_API_KEY,
      },
    }
  );

  if (!res.ok) {
    alert("Failed to download replies");
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `campaign_${selectedId}_replies.csv`;
  a.click();

  URL.revokeObjectURL(url);
};

  // -------------------------------------------
  // Upload CSV & send campaign
  // -------------------------------------------

// const sendCampaign = async file => {
//   if (!file || !selectedId) return;

//   setBusy(true);
//   setError("");

//   try {
//     // 1. Read CSV in browser
//     const text = await file.text();
//     const emails = text
//       .split(/\r?\n/)
//       .map(l => l.trim())
//       .filter(l => l && l.includes("@"));

//     if (!emails.length) {
//       throw new Error("No valid emails found in CSV");
//     }

//     // 2. Upload emails
//     const upload = await fetch(
//       `${API_BASE}/campaigns/${selectedId}/upload-emails`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-M-Key": M_API_KEY,
//         },
//         body: JSON.stringify({ emails }),
//       }
//     );

//     if (!upload.ok) {
//       throw new Error("Failed to upload emails");
//     }

//     // 3. Send campaign
//     const send = await fetch(
//       `${API_BASE}/campaigns/${selectedId}/send`,
//       {
//         method: "POST",
//         headers: { "X-M-Key": M_API_KEY },
//       }
//     );

//     const result = await send.json();

//     if (!send.ok) {
//       throw new Error(result.error || "Send failed");
//     }

//     alert(`Sent: ${result.sent}\nFailed: ${result.failed}`);
//     loadCampaigns();

//   } catch (e) {
//     setError(e.message || "Send failed");
//   } finally {
//     setBusy(false);
//   }
// };

const uploadRecipients = async file => {
  if (!file || !selectedId) return;

  setBusy(true);
  setError("");

  try {
    const text = await file.text();
    const emails = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && l.includes("@"));

    if (!emails.length) {
      throw new Error("No valid emails found");
    }

    const res = await fetch(
      `${API_BASE}/campaigns/${selectedId}/upload-emails`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-M-Key": M_API_KEY,
        },
        body: JSON.stringify({ emails }),
      }
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.error);

    alert(`Uploaded ${result.uploaded} recipients`);
  } catch (e) {
    setError(e.message);
  } finally {
    setBusy(false);
  }
};

const sendCampaignNow = async () => {
  if (!selectedId) return;

  setBusy(true);
  setError("");

  try {
    const res = await fetch(
      `${API_BASE}/campaigns/${selectedId}/send`,
      {
        method: "POST",
        headers: { "X-M-Key": M_API_KEY },
      }
    );

    const result = await res.json();
    if (!res.ok) throw new Error(result.error);

    alert(`Sent: ${result.sent}\nFailed: ${result.failed}`);
    loadCampaigns();
  } catch (e) {
    setError(e.message);
  } finally {
    setBusy(false);
  }
};

  // -------------------------------------------
  // Downloads
  // -------------------------------------------

  const download = url => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.click();
  };

  // -------------------------------------------
  // Render
  // -------------------------------------------

  if (status === "loading") return <p>Loading…</p>;
  if (status === "error") return <p>Error loading campaigns</p>;

  return (
    <div style={{ padding: 32, fontFamily: "system-ui" }}>
    <h1>M-UI Campaign Manager</h1>
    <p style={{ color: "#555", marginTop: -8 }}>
      Create campaigns, upload recipient lists, send emails, and export data.
    </p>


      {error && <p style={{ color: "red" }}>{error}</p>}

      <h3>Create a new campaign</h3>
      <p style={{ color: "#666", marginTop: -8 }}>
        This creates a campaign container. Content is written in C-UI.
      </p>


      {/* Create campaign */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="New campaign name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button disabled={busy} onClick={createCampaign}>
          Create
        </button>
        <button disabled={busy} onClick={loadCampaigns}>
          Refresh
        </button>
      </div>
    <hr style={{ margin: "24px 0" }} />

      {/* Campaign selector */}
      <h3>Select a campaign</h3>
      <p style={{ color: "#666", marginTop: -8 }}>
        Choose a campaign to upload recipients, send emails, or download results.
      </p>

      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
      >
        <option value="">— Choose a campaign —</option>
        {campaigns.map(c => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.status}
          </option>
        ))}
      </select>

        {selected && (
          <>
            <hr />
            <h3>Campaign overview</h3>
            <p style={{ color: "#666", marginTop: -8 }}>
              Review content written in C-UI and current campaign status.
            </p>


          <p><strong>Status:</strong> {selected.status}</p>
          <p><strong>Subject:</strong> {selected.subject || "—"}</p>
          <p><strong>Body:</strong></p>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {selected.body || "—"}
          </pre>

          <p><strong>Replies:</strong> {repliesCount}</p>

          <hr />

          {/* Send */}
         <h3>Send campaign</h3>
        <p style={{ color: "#666", marginTop: -8 }}>
          Upload a CSV of recipient emails. Emails are sent immediately.
        </p>

          {selected.status !== "ready" && (
            <p style={{ color: "#b45309" }}>
              Campaign must be marked <strong>ready</strong> in C-UI before sending.
            </p>
          )}

          <input
            type="file"
            accept=".csv"
            disabled={busy}
            onChange={e => uploadRecipients(e.target.files[0])}
          />

          <p style={{ color: "#777", fontSize: 14 }}>
            CSV should contain one email address per line.
          </p>

          <hr />
<button
  onClick={sendCampaignNow}
  disabled={busy || selected.status !== "ready"}
>
  Send campaign
</button>

          <hr />
          {/* Downloads */}
         <h3>Downloads</h3>
        <p style={{ color: "#666", marginTop: -8 }}>
          Export data for tracking and analysis.
        </p>


          <button onClick={downloadRecipientMapCSV}>
            Download email ↔ token CSV
          </button>


          <br /><br />

          <button onClick={downloadRepliesCSV}>
            Download replies CSV
          </button>

        <hr style={{ margin: "40px 0" }} />
{/* 
        <h3 style={{ color: "#b91c1c" }}>Danger zone</h3>
        <p style={{ color: "#7f1d1d", maxWidth: 500 }}>
          This will permanently delete <strong>all campaigns, recipients, and replies</strong>.
          Use only for testing or full resets.
        </p> */}


        </>
        
      )}

<hr style={{ margin: "48px 0" }} />

<h3 style={{ color: "#b91c1c" }}>Danger zone</h3>
<p style={{ color: "#7f1d1d", maxWidth: 500 }}>
  This will permanently delete <strong>all campaigns, recipients, and replies</strong>.
  Use only for testing or full resets.
</p>

<button
  onClick={clearAllData}
  style={{
    background: "#dc2626",
    color: "white",
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  }}
>
  Clear all data
</button>

    </div>
    
  );
}
