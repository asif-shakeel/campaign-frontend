import { useEffect, useState } from "react";

const API_BASE = "https://campaign-core.onrender.com";
const C_API_KEY =
  "5cc768d9de2ffd4030f1374390451aa14994af27273e599cc13b9c4364f80360";

export default function App() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");

  const selected = campaigns.find(c => c.id === selectedId);

  // --------------------------------------------------
  // Load campaigns
  // --------------------------------------------------

  const loadCampaigns = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        headers: { "X-C-Key": C_API_KEY },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCampaigns(
        data.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      );
      setLoading(false);
    } catch {
      setError("Failed to load campaigns");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // --------------------------------------------------
  // Load campaign content + replies
  // --------------------------------------------------

  const loadReplies = async campaignId => {
    try {
      const res = await fetch(
        `${API_BASE}/replies?campaign_id=${campaignId}`,
        {
          headers: { "X-C-Key": C_API_KEY },
        }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReplies(data);
    } catch {
      setReplies([]);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setSubject("");
      setBody("");
      setReplies([]);
      return;
    }

    setSubject(selected?.subject || "");
    setBody(selected?.body || "");
    loadReplies(selectedId);

    const id = setInterval(() => loadReplies(selectedId), 5000);
    return () => clearInterval(id);
  }, [selectedId]);

  // --------------------------------------------------
  // Save content
  // --------------------------------------------------

  const saveContent = async () => {
    if (!selectedId || !subject.trim() || !body.trim()) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/campaigns/${selectedId}/content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-C-Key": C_API_KEY,
          },
          body: JSON.stringify({ subject, body }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }

      setCampaigns(campaigns =>
        campaigns.map(c =>
          c.id === selectedId
            ? { ...c, subject, body, status: "ready" }
            : c
        )
      );

      alert("Campaign content saved");
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Create Campaign
  // --------------------------------------------------

const createCampaign = async () => {
  if (!newName.trim()) return;

  const res = await fetch(`${API_BASE}/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-C-Key": C_API_KEY,
    },
    body: JSON.stringify({ name: newName }),
  });

  if (!res.ok) {
    alert("Failed to create campaign");
    return;
  }

  const campaign = await res.json();
  setCampaigns([campaign, ...campaigns]);
  setSelectedId(campaign.id);
  setNewName("");
};


  // --------------------------------------------------
  // Download replies CSV
  // --------------------------------------------------

const downloadRepliesCSV = async () => {
  if (!selectedId) return;

  const res = await fetch(
    `${API_BASE}/campaigns/${selectedId}/replies.csv`,
    {
      headers: {
        "X-C-Key": C_API_KEY,
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

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const canEdit = selected && selected.status !== "sent";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f7f8",
        padding: "40px 16px",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "32px 40px",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h1>C-UI Campaign Editor</h1>
        <p style={{ color: "#555" }}>
          Edit campaign content · View replies
        </p>

        {/* Campaign selector */}
        <h3>Create a new campaign</h3>
        <p style={{ color: "#666", marginTop: -8 }}>
          This creates a campaign shell. Content and emails are added later.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="New campaign name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={createCampaign}>
          Create
        </button>
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h3>Select an existing campaign</h3>
      <p style={{ color: "#666", marginTop: -8 }}>
        Choose a campaign to edit its content or review replies.
      </p>

        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          <option value="">— Choose a campaign to edit —</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.status}
            </option>
          ))}
        </select>

        {!selected && (
          <p style={{ color: "#777", marginTop: 16 }}>
            Select a campaign above to edit its subject, body, and view replies.
          </p>
        )}

        {selected && (
          <>
            <hr style={{ margin: "24px 0" }} />

            {selected.status === "sent" && (
              <p style={{ color: "#b45309" }}>
                This campaign has already been sent.
              </p>
            )}

            <input
              placeholder="Email subject"
              value={subject}
              disabled={!canEdit}
              onChange={e => setSubject(e.target.value)}
              style={{ width: "100%", marginTop: 12 }}
            />

            <textarea
              placeholder="Email body"
              value={body}
              disabled={!canEdit}
              onChange={e => setBody(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                marginTop: 12,
                resize: "vertical",
              }}
            />

            <button
              style={{ marginTop: 12 }}
              onClick={saveContent}
              disabled={!canEdit || saving}
            >
              {saving ? "Saving…" : "Save content"}
            </button>

            <hr style={{ margin: "28px 0" }} />

            <p>
              Replies received: <strong>{replies.length}</strong>
            </p>

            {replies.length > 0 && (
              <button onClick={downloadRepliesCSV}>
                Download replies CSV
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
