import { useState } from "react";
import type { Campaign } from "@/types";

interface Props {
  campaigns: Campaign[];
}

interface DetailModalProps {
  campaign: Campaign;
  onClose: () => void;
}

function DetailModal({ campaign, onClose }: DetailModalProps) {
  return (
    <div className="modal-backdrop open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{campaign.templateName}</div>
          <div className="modal-desc">Sent {campaign.sentAt}</div>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)', marginBottom: 8 }}>Summary</div>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Recipients</div>
                <div className="stat-value">{campaign.recipientCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Variables</div>
                <div className="stat-value">{campaign.variables.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Status</div>
                <div className="stat-value" style={{ color: 'var(--green)' }}>Sent</div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx2)', marginBottom: 8 }}>Recipients</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', lineHeight: 1.8 }}>
              {campaign.recipients.map((r, i) => <div key={i}>{r}</div>)}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function HistorySection({ campaigns }: Props) {
  const [detail, setDetail] = useState<Campaign | null>(null);
  const sorted = [...campaigns].reverse();

  return (
    <>
      <div className="panel">
        <div className="panel-header">Campaign history</div>
        <div className="panel-body" style={{ padding: 0 }}>
          {sorted.length === 0 ? (
            <div className="empty-state">No campaigns sent yet.</div>
          ) : (
            sorted.map(c => (
              <div key={c.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <div className="list-item-title">{c.templateName}</div>
                  <div className="list-item-meta">{c.recipientCount} recipient{c.recipientCount !== 1 ? 's' : ''} · {c.sentAt}</div>
                </div>
                <button className="btn" onClick={() => setDetail(c)}>View</button>
              </div>
            ))
          )}
        </div>
      </div>

      {detail && <DetailModal campaign={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
