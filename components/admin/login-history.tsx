import { DeviceChip } from "@/components/admin/device-chip";
import { PlaceLine } from "@/components/admin/place-line";
import { Badge } from "@/components/ui/badge";
import { ago, dateTime } from "@/lib/admin-format";
import type { FlaggedLoginEvent, PlaceSummary } from "@/lib/admin-monitor-utils";
import type { LoginEventRow } from "@/lib/data/admin-monitor";

export function LoginHistory({
  events,
  places,
}: {
  events: FlaggedLoginEvent<LoginEventRow>[];
  places: PlaceSummary[];
}) {
  return (
    <div className="space-y-6">
      {/* Places summary */}
      {places.length > 0 && (
        <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
          <h3 className="mb-3 text-lg font-bold">Các nơi đã đăng nhập ({places.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((p, idx) => (
              <div key={idx} className="rounded-md border border-border bg-surface-2 p-3 text-sm">
                <PlaceLine
                  city={p.city}
                  region={p.region}
                  country={p.country}
                  latitude={p.latitude}
                  longitude={p.longitude}
                  showMap
                />
                <div className="mt-2 flex items-center justify-between text-xs text-fg-muted">
                  <span>{p.count} lượt đăng nhập</span>
                  <span>Gần nhất: {ago(p.lastAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Login event history table */}
      <section className="rounded-lg bg-surface p-5 shadow-sm dark:border dark:border-border">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">Lịch sử đăng nhập ({events.length})</h3>
            <p className="text-xs text-fg-muted">
              Lưu tối đa 90 ngày và 200 lượt gần nhất theo chính sách quyền riêng tư.
            </p>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">Chưa ghi nhận lịch sử đăng nhập nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="p-3">Thời gian</th>
                  <th scope="col" className="p-3">Vị trí ước tính</th>
                  <th scope="col" className="p-3">Thiết bị</th>
                  <th scope="col" className="p-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-surface-2/50">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium">{dateTime(ev.created_at, true)}</div>
                      <div className="text-xs text-fg-muted">{ago(ev.created_at)}</div>
                    </td>
                    <td className="p-3">
                      <PlaceLine
                        city={ev.city}
                        region={ev.region}
                        country={ev.country}
                        ip={ev.ip}
                        latitude={ev.latitude}
                        longitude={ev.longitude}
                        showMap
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <DeviceChip
                        deviceType={ev.device_type}
                        browser={ev.browser}
                        os={ev.os}
                        deviceModel={ev.device_model}
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1.5">
                        {ev.newPlace && <Badge tone="sun">Nơi mới</Badge>}
                        {ev.newDevice && <Badge tone="grape">Thiết bị mới</Badge>}
                        {!ev.newPlace && !ev.newDevice && (
                          <span className="text-xs text-fg-subtle">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
