import { useEffect, useState } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Kurse } from '@/types/app';
import { BookOpen, Users, GraduationCap, DoorOpen, ClipboardList, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Stats {
  kurse: number;
  aktiveKurse: number;
  dozenten: number;
  teilnehmer: number;
  raeume: number;
  anmeldungen: number;
  bezahltQuote: number;
  umsatz: number;
}

const BAR_COLORS = ['#7c9fff', '#5c7fe0', '#4f6fc5', '#3a57a8'];

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({
    kurse: 0, aktiveKurse: 0, dozenten: 0, teilnehmer: 0,
    raeume: 0, anmeldungen: 0, bezahltQuote: 0, umsatz: 0,
  });
  const [recentKurse, setRecentKurse] = useState<Kurse[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [dozentenData, teilnehmerData, raeumeData, kurseData, anmeldungenData] = await Promise.all([
          LivingAppsService.getDozenten(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
        ]);

        const aktiveKurse = kurseData.filter(k => k.fields.status === 'aktiv').length;
        const bezahlt = anmeldungenData.filter(a => a.fields.bezahlt).length;
        const bezahltQuote = anmeldungenData.length > 0 ? Math.round((bezahlt / anmeldungenData.length) * 100) : 0;

        let umsatz = 0;
        const bezahltAnmeldungen = anmeldungenData.filter(a => a.fields.bezahlt);
        for (const anm of bezahltAnmeldungen) {
          if (anm.fields.kurs) {
            const kursId = anm.fields.kurs.match(/([a-f0-9]{24})$/i)?.[1];
            const kurs = kurseData.find(k => k.record_id === kursId);
            if (kurs?.fields.preis) umsatz += kurs.fields.preis;
          }
        }

        const statusCounts = { geplant: 0, aktiv: 0, abgeschlossen: 0, abgesagt: 0 };
        kurseData.forEach(k => {
          const s = k.fields.status || 'geplant';
          statusCounts[s as keyof typeof statusCounts]++;
        });
        setStatusData([
          { name: 'Geplant', value: statusCounts.geplant },
          { name: 'Aktiv', value: statusCounts.aktiv },
          { name: 'Abgeschl.', value: statusCounts.abgeschlossen },
          { name: 'Abgesagt', value: statusCounts.abgesagt },
        ]);

        const sorted = [...kurseData].sort((a, b) => {
          const da = a.fields.startdatum || '';
          const db = b.fields.startdatum || '';
          return db.localeCompare(da);
        }).slice(0, 5);
        setRecentKurse(sorted);

        setStats({
          kurse: kurseData.length,
          aktiveKurse,
          dozenten: dozentenData.length,
          teilnehmer: teilnehmerData.length,
          raeume: raeumeData.length,
          anmeldungen: anmeldungenData.length,
          bezahltQuote,
          umsatz,
        });
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const statusIcon = (status?: string) => {
    if (status === 'aktiv') return <CheckCircle size={13} className="text-emerald-500" />;
    if (status === 'abgesagt') return <XCircle size={13} className="text-rose-500" />;
    if (status === 'abgeschlossen') return <CheckCircle size={13} className="text-sky-500" />;
    return <Clock size={13} className="text-amber-500" />;
  };

  const statusLabel = (status?: string) => {
    const map: Record<string, string> = { geplant: 'Geplant', aktiv: 'Aktiv', abgeschlossen: 'Abgeschlossen', abgesagt: 'Abgesagt' };
    return map[status || 'geplant'] || 'Geplant';
  };

  const statusBadgeClass = (status?: string) => {
    if (status === 'aktiv') return 'badge-aktiv';
    if (status === 'abgesagt') return 'badge-abgesagt';
    if (status === 'abgeschlossen') return 'badge-abgeschlossen';
    return 'badge-geplant';
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white" style={{ background: 'var(--gradient-hero)', boxShadow: 'var(--shadow-hero)' }}>
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 opacity-60">Willkommen</p>
          <h1 className="text-4xl font-bold tracking-tight mb-1">KursVerwaltung</h1>
          <p className="text-base font-light opacity-70">Ihre zentrale Übersicht für Kurse, Dozenten und Teilnehmer.</p>
          <div className="mt-6 flex flex-wrap gap-8">
            <div>
              <p className="text-3xl font-bold">{loading ? '–' : stats.kurse}</p>
              <p className="text-xs opacity-60 mt-0.5">Kurse gesamt</p>
            </div>
            <div className="w-px opacity-20 self-stretch" />
            <div>
              <p className="text-3xl font-bold">{loading ? '–' : stats.aktiveKurse}</p>
              <p className="text-xs opacity-60 mt-0.5">Aktuell aktiv</p>
            </div>
            <div className="w-px opacity-20 self-stretch" />
            <div>
              <p className="text-3xl font-bold">{loading ? '–' : `${stats.umsatz.toLocaleString('de-DE')} €`}</p>
              <p className="text-xs opacity-60 mt-0.5">Bezahlter Umsatz</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none" style={{ background: 'white', transform: 'translate(35%, -35%)' }} />
        <div className="absolute bottom-0 right-24 w-48 h-48 rounded-full opacity-10 pointer-events-none" style={{ background: 'white', transform: 'translateY(45%)' }} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Dozenten', value: stats.dozenten, Icon: GraduationCap },
          { label: 'Teilnehmer', value: stats.teilnehmer, Icon: Users },
          { label: 'Räume', value: stats.raeume, Icon: DoorOpen },
          { label: 'Kurse', value: stats.kurse, Icon: BookOpen },
          { label: 'Anmeldungen', value: stats.anmeldungen, Icon: ClipboardList },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-xl border p-5" style={{ background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.52 0.03 255)' }}>{label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.58 0.19 250 / 0.12)' }}>
                <Icon size={15} style={{ color: 'oklch(0.45 0.18 255)' }} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{loading ? '–' : value}</p>
          </div>
        ))}
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status-Verteilung */}
        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'oklch(0.52 0.03 255)' }}>Kursstatus</h3>
          <p className="text-2xl font-bold mb-5">{loading ? '–' : stats.kurse} Kurse</p>
          {loading ? (
            <div className="h-44 rounded-lg animate-pulse" style={{ background: 'oklch(0.93 0.03 255)' }} />
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={statusData} barSize={30} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.52 0.03 255)' }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid oklch(0.88 0.01 255)', fontSize: 12, fontFamily: 'var(--font-sans)' }}
                  cursor={{ fill: 'oklch(0.93 0.03 255)' }}
                />
                <Bar dataKey="value" name="Kurse" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Zahlungsquote */}
        <div className="rounded-xl border p-6 flex flex-col justify-between" style={{ background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'oklch(0.52 0.03 255)' }}>Zahlungsquote</h3>
            <p className="text-5xl font-bold tracking-tight">{loading ? '–' : `${stats.bezahltQuote}%`}</p>
            <p className="text-sm mt-1" style={{ color: 'oklch(0.52 0.03 255)' }}>der Anmeldungen bezahlt</p>
          </div>
          <div className="mt-8">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'oklch(0.52 0.03 255)' }}>
              <span>Bezahlt</span>
              <span>{stats.bezahltQuote}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.93 0.03 255)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${stats.bezahltQuote}%`, background: 'oklch(0.58 0.19 250)', transition: 'width 0.7s ease' }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'oklch(0.45 0.12 255)' }}>
              <TrendingUp size={15} />
              <span>{loading ? '–' : `${stats.umsatz.toLocaleString('de-DE')} € Umsatz`}</span>
            </div>
          </div>
        </div>

        {/* Recent Courses */}
        <div className="rounded-xl border p-6" style={{ background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'oklch(0.52 0.03 255)' }}>Letzte Kurse</h3>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'oklch(0.93 0.03 255)' }} />)}
            </div>
          ) : recentKurse.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44" style={{ color: 'oklch(0.65 0.02 255)' }}>
              <BookOpen size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Noch keine Kurse vorhanden</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentKurse.map(kurs => (
                <div key={kurs.record_id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'oklch(0.975 0.005 255)' }}>
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium truncate">{kurs.fields.titel || '–'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'oklch(0.52 0.03 255)' }}>
                      {kurs.fields.startdatum ? format(parseISO(kurs.fields.startdatum), 'dd. MMM yyyy', { locale: de }) : '–'}
                      {kurs.fields.preis != null ? ` · ${kurs.fields.preis.toLocaleString('de-DE')} €` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(kurs.fields.status)}`}>
                    {statusIcon(kurs.fields.status)}
                    {statusLabel(kurs.fields.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
