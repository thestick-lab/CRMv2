import * as React from 'react';
import { Search, Mail, Phone, Building2, UserCheck, Briefcase } from 'lucide-react';
import { buildPeopleProfiles, filterPeople, type Person } from './people-data';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PeopleDirectoryProps {
  onNavigateClient?: (code: string) => void;
  className?: string;
}

export function PeopleDirectory({ onNavigateClient, className }: PeopleDirectoryProps) {
  const { staff, clients } = usePracticeStore();
  const [filter, setFilter] = React.useState<'all' | 'staff' | 'directors'>('all');
  const [query, setQuery] = React.useState('');

  const allPeople = React.useMemo(() => {
    return buildPeopleProfiles(staff, clients);
  }, [staff, clients]);

  const filteredPeople = React.useMemo(() => {
    return filterPeople(allPeople, filter, query);
  }, [allPeople, filter, query]);

  const staffCount = React.useMemo(
    () => allPeople.filter((p) => p.isPracticeStaff).length,
    [allPeople]
  );
  const directorsCount = React.useMemo(
    () => allPeople.filter((p) => !p.isPracticeStaff).length,
    [allPeople]
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Top Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="inline-flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/60 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-colors',
              filter === 'all'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All <span className="font-mono text-xs opacity-70">({allPeople.length})</span>
          </button>
          <button
            onClick={() => setFilter('staff')}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-colors',
              filter === 'staff'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Practice Team <span className="font-mono text-xs opacity-70">({staffCount})</span>
          </button>
          <button
            onClick={() => setFilter('directors')}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-colors',
              filter === 'directors'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Company Directors <span className="font-mono text-xs opacity-70">({directorsCount})</span>
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search people, roles, companies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Directory Grid */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No people found matching "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map((person) => {
            const initials = person.name
              .split(/\s+/)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={person.id}
                className="group p-4 rounded-xl border border-border/80 bg-card hover:border-border transition-all hover:shadow-xs flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center font-mono font-semibold text-xs shrink-0',
                        person.isPracticeStaff
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-muted text-foreground border border-border'
                      )}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {person.name}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {person.isPracticeStaff ? (
                          <span className="flex items-center gap-1 text-primary">
                            <Briefcase className="h-3 w-3" />
                            {person.practiceRole}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            Director / Officer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono shrink-0',
                      person.isPracticeStaff
                        ? 'border-primary/30 text-primary bg-primary/5'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {person.isPracticeStaff ? 'Staff' : 'Director'}
                  </Badge>
                </div>

                {/* Direct Contact Triggers */}
                <div className="space-y-1.5 text-xs text-muted-foreground border-y border-border/50 py-2.5 font-mono">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={`mailto:${person.email}`}
                      className="hover:text-foreground hover:underline truncate"
                    >
                      {person.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a
                      href={`tel:${person.phone}`}
                      className="hover:text-foreground hover:underline font-tnum"
                    >
                      {person.phone}
                    </a>
                  </div>
                </div>

                {/* Linked Companies Section */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Linked Companies</span>
                    <span className="font-tnum">({person.companyLinks.length})</span>
                  </div>

                  {person.companyLinks.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">No linked entities</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {person.companyLinks.map((link) => (
                        <button
                          key={link.clientCode}
                          onClick={() => onNavigateClient?.(link.clientCode)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 hover:bg-muted text-xs border border-border/60 transition-colors group/pill"
                          title={`${link.clientName} (${link.title}) — Click to view record`}
                        >
                          <span className="font-mono font-medium text-foreground group-hover/pill:text-primary">
                            {link.clientCode}
                          </span>
                          <span className="text-muted-foreground truncate max-w-[120px]">
                            {link.clientName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
