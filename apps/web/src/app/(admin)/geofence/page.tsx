import type { Metadata } from 'next';
import { Notice } from '@/components/admin/notice';
import { PageHeader } from '@/components/admin/page-header';
import { upsertGeofenceConfigAction } from '@/lib/admin/actions';
import { getGeofenceConfig } from '@/lib/admin/data';

type GeofencePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Geofence | Face Web Admin',
};

export default async function GeofencePage({ searchParams }: GeofencePageProps) {
  const params = await searchParams;
  const config = await getGeofenceConfig();
  const isEnabled =
    config?.centerLat != null &&
    config.centerLon != null &&
    config.radiusMeters != null;

  return (
    <main className="admin-content">
      <PageHeader
        description="Configure the company attendance geofence used to flag check-in and check-out events outside the allowed radius."
        eyebrow="Administration"
        title="Geofence"
      />
      <Notice searchParams={params} />

      <section className="geofence-layout">
        <form action={upsertGeofenceConfigAction} className="form-panel geofence-form">
          <div className="form-grid">
            <label className="field">
              <span>Center latitude</span>
              <input
                defaultValue={config?.centerLat ?? ''}
                inputMode="decimal"
                max="90"
                min="-90"
                name="centerLat"
                placeholder="10.7769"
                step="any"
                type="number"
              />
            </label>
            <label className="field">
              <span>Center longitude</span>
              <input
                defaultValue={config?.centerLon ?? ''}
                inputMode="decimal"
                max="180"
                min="-180"
                name="centerLon"
                placeholder="106.7009"
                step="any"
                type="number"
              />
            </label>
            <label className="field">
              <span>Radius meters</span>
              <input
                defaultValue={config?.radiusMeters ?? ''}
                inputMode="numeric"
                min="1"
                name="radiusMeters"
                placeholder="150"
                step="1"
                type="number"
              />
            </label>
          </div>

          <p className="form-hint">
            Leave any field blank to disable geofence evaluation. Attendance
            events without device coordinates are also stored as not evaluated.
          </p>

          <button className="primary-button" type="submit">
            Save geofence
          </button>
        </form>

        <aside className="geofence-panel">
          <div className={isEnabled ? 'geofence-preview is-enabled' : 'geofence-preview'}>
            <span className="geofence-radius" />
            <span className="geofence-pin" />
          </div>

          <dl className="geofence-summary">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={isEnabled ? 'badge' : 'badge badge-muted'}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </dd>
            </div>
            <div>
              <dt>Center</dt>
              <dd>
                {config?.centerLat != null && config.centerLon != null
                  ? `${config.centerLat}, ${config.centerLon}`
                  : 'Not configured'}
              </dd>
            </div>
            <div>
              <dt>Radius</dt>
              <dd>{config?.radiusMeters != null ? `${config.radiusMeters} m` : 'Not configured'}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{config?.updatedAt ? formatDateTime(config.updatedAt) : 'Never'}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
