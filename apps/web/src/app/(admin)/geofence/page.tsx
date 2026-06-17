import { MapPin } from 'lucide-react';
import type { GeoConfig } from '@face-web/shared';
import { MessageBanner } from '@/components/admin/message-banner';
import { SubmitButton } from '@/components/forms/submit-button';
import { updateGeofenceAction } from '@/lib/actions';
import { backendFetch } from '@/lib/api';
import { compactNumber } from '@/lib/format';
import { asString, type PageSearchParams } from '@/lib/search';

export default async function GeofencePage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const config = await backendFetch<GeoConfig | null>('/config/geofence');

  return (
    <main className="content">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Location policy</p>
          <h1>Geofence</h1>
          <p className="muted">Set the company-wide valid attendance area.</p>
        </div>
      </section>

      <MessageBanner
        error={asString(params.error)}
        message={asString(params.message)}
      />

      <section className="two-column">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Configuration</h2>
              <p className="muted">
                Events outside this radius are marked, not blocked.
              </p>
            </div>
          </div>
          <form className="stacked-form" action={updateGeofenceAction}>
            <input type="hidden" name="returnTo" value="/geofence" />
            <div className="form-grid compact">
              <label className="field">
                <span>Center latitude</span>
                <input
                  name="centerLat"
                  type="number"
                  step="any"
                  required
                  defaultValue={config?.centerLat ?? ''}
                />
              </label>
              <label className="field">
                <span>Center longitude</span>
                <input
                  name="centerLon"
                  type="number"
                  step="any"
                  required
                  defaultValue={config?.centerLon ?? ''}
                />
              </label>
              <label className="field">
                <span>Radius meters</span>
                <input
                  name="radiusMeters"
                  type="number"
                  min={1}
                  max={100000}
                  required
                  defaultValue={config?.radiusMeters ?? 200}
                />
              </label>
            </div>
            <SubmitButton className="primary-button">Save geofence</SubmitButton>
          </form>
        </article>

        <article className="panel geofence-visual">
          <div className="geo-target">
            <div className="geo-radius">
              <MapPin aria-hidden="true" size={30} />
            </div>
          </div>
          {config ? (
            <dl className="summary-list">
              <div>
                <dt>Latitude</dt>
                <dd>{config.centerLat}</dd>
              </div>
              <div>
                <dt>Longitude</dt>
                <dd>{config.centerLon}</dd>
              </div>
              <div>
                <dt>Radius</dt>
                <dd>{compactNumber(config.radiusMeters)}m</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-state">
              <h3>No geofence configured</h3>
              <p>Attendance events are currently treated as in-zone.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
