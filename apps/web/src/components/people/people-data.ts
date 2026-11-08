import type { Client, StaffMember } from 'fdoncall-practice/domain/types';

export interface CompanyLink {
  clientCode: string;
  clientName: string;
  title: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  isPracticeStaff: boolean;
  practiceRole?: 'Partner' | 'Accountant' | 'Compliance Officer' | 'Subcontractor' | 'Team member';
  companyLinks: CompanyLink[];
}
export function canManagePeople(role?: string): boolean {
  return role === 'Partner' || role === 'Compliance Officer' || role === 'Admin';
}


export const STATIC_DIRECTORS: Array<{
  id: string;
  name: string;
  email: string;
  phone: string;
  clientCode: string;
  title: string;
}> = [
  {
    id: 'dir-alb',
    name: 'Albert Coetzee',
    email: 'albert@coetzeefamily.co.za',
    phone: '+27 82 455 1982',
    clientCode: 'ALB-207',
    title: 'Managing Director',
  },
  {
    id: 'dir-alc',
    name: 'Lucas Van Niekerk',
    email: 'lucas@alcontracting.co.za',
    phone: '+27 83 290 4112',
    clientCode: 'ALC-610',
    title: 'Director',
  },
  {
    id: 'dir-all',
    name: 'Francois Du Plessis',
    email: 'francois@alliedservices.co.za',
    phone: '+27 82 918 3340',
    clientCode: 'ALL-362',
    title: 'Managing Director',
  },
  {
    id: 'dir-axe',
    name: 'Herman Bester',
    email: 'herman@axegroup.co.za',
    phone: '+27 84 550 7821',
    clientCode: 'AXE-741',
    title: 'Chief Executive Officer',
  },
  {
    id: 'dir-ene',
    name: 'Dr. Annelie Kruger',
    email: 'annelie@energygroup.co.za',
    phone: '+27 82 660 3019',
    clientCode: 'ENE-914',
    title: 'Principal Partner',
  },
  {
    id: 'dir-kne',
    name: 'Gerhardus Botha',
    email: 'gerhardus@kneadgroup.co.za',
    phone: '+27 83 771 8842',
    clientCode: 'KNE-402',
    title: 'Managing Director',
  },
  {
    id: 'dir-mus',
    name: 'Marthinus De Villiers',
    email: 'marthinus@muse1399.co.za',
    phone: '+27 82 344 9102',
    clientCode: 'MUS-875',
    title: 'Director',
  },
  {
    id: 'dir-sig',
    name: 'Johan Steenkamp',
    email: 'johan@signalgun.co.za',
    phone: '+27 82 559 1084',
    clientCode: 'SIG-530',
    title: 'Director',
  },
  {
    id: 'dir-zon',
    name: 'Willem Grobbelaar',
    email: 'willem@zonderwater.co.za',
    phone: '+27 83 412 9055',
    clientCode: 'ZON-119',
    title: 'Trustee / Director',
  },
];

export function buildPeopleProfiles(staff: StaffMember[], clients: Client[]): Person[] {
  const clientMap = new Map(clients.map((c) => [c.code, c.name]));

  // 9 Practice Staff
  const staffProfiles: Person[] = staff.map((s, idx) => {
    const assignedClients = clients.filter((c) => c.staffId === s.id);
    const companyLinks: CompanyLink[] = assignedClients.map((c) => ({
      clientCode: c.code,
      clientName: c.name,
      title: s.role === 'Partner' ? 'Engagement Partner' : 'Client Accountant',
    }));

    return {
      id: `staff-${s.id}`,
      name: s.name,
      email: `${s.id}@fdoncall.co.za`,
      phone: `+27 21 975 10${(idx + 1).toString().padStart(2, '0')}`,
      isPracticeStaff: true,
      practiceRole: s.role as Person['practiceRole'],
      companyLinks,
    };
  });

  // 9 Client Directors
  const directorProfiles: Person[] = STATIC_DIRECTORS.map((d) => {
    const clientName = clientMap.get(d.clientCode) || d.clientCode;
    return {
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      isPracticeStaff: false,
      companyLinks: [
        {
          clientCode: d.clientCode,
          clientName,
          title: d.title,
        },
      ],
    };
  });

  return [...staffProfiles, ...directorProfiles];
}

export function filterPeople(
  people: Person[],
  filter: 'all' | 'staff' | 'directors',
  query: string
): Person[] {
  let result = people;

  if (filter === 'staff') {
    result = result.filter((p) => p.isPracticeStaff);
  } else if (filter === 'directors') {
    result = result.filter((p) => !p.isPracticeStaff);
  }

  const q = query.trim().toLowerCase();
  if (!q) return result;

  return result.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    if (p.email.toLowerCase().includes(q)) return true;
    if (p.phone.toLowerCase().includes(q)) return true;
    if (p.practiceRole?.toLowerCase().includes(q)) return true;
    return p.companyLinks.some(
      (link) =>
        link.clientCode.toLowerCase().includes(q) ||
        link.clientName.toLowerCase().includes(q) ||
        link.title.toLowerCase().includes(q)
    );
  });
}
