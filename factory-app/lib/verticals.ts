export interface VerticalConfig {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  terminology: {
    order: string; orders: string;
    item: string; items: string;
    customer: string; customers: string;
    staff: string;
    ready: string;
    intake: string;
  };
  workflowStages: { id: string; label: string }[];
  defaultServices: { name: string; basePrice: number }[];
  sampleCustomers: { name: string; phone: string; email: string; notes: string }[];
  painPoints: string[];
  domainContext: string;
}

export const VERTICALS: Record<string, VerticalConfig> = {
  dry_cleaning: {
    id: 'dry_cleaning', name: 'Dry Cleaning', emoji: '👔',
    tagline: 'Track garments from drop-off to pickup',
    terminology: {
      order: 'ticket', orders: 'tickets', item: 'garment', items: 'garments',
      customer: 'customer', customers: 'customers', staff: 'associate',
      ready: 'ready for pickup', intake: 'drop-off',
    },
    workflowStages: [
      { id: 'received', label: 'Received' }, { id: 'spotting', label: 'Spotting' },
      { id: 'cleaning', label: 'Cleaning' }, { id: 'pressing', label: 'Pressing' },
      { id: 'finishing', label: 'Finishing' }, { id: 'ready', label: 'Ready for Pickup' },
      { id: 'picked_up', label: 'Picked Up' },
    ],
    defaultServices: [
      { name: 'Shirt (standard)', basePrice: 4.50 },
      { name: 'Shirt (dress/formal)', basePrice: 6.00 },
      { name: 'Pants', basePrice: 8.00 },
      { name: 'Suit (2-piece)', basePrice: 18.00 },
      { name: 'Dress (casual)', basePrice: 14.00 },
      { name: 'Jacket / Blazer', basePrice: 14.00 },
      { name: 'Coat', basePrice: 22.00 },
      { name: 'Comforter (twin)', basePrice: 28.00 },
    ],
    sampleCustomers: [
      { name: 'Maria Santos', phone: '(555) 234-5678', email: 'maria.santos@email.com', notes: 'Light starch on shirts' },
      { name: 'James Wilson', phone: '(555) 345-6789', email: 'j.wilson@email.com', notes: 'Regular Monday drop-off' },
      { name: 'Linda Chen', phone: '(555) 456-7890', email: 'lchen@email.com', notes: 'No plastic garment bags' },
    ],
    painPoints: [
      'Losing paper tickets and misplacing garments between stages',
      'Customers calling to check if their order is ready',
      'No record of special instructions (starch preference, hanger type)',
      'Manual price calculation errors',
      'Unable to track rush orders vs. standard turnaround',
    ],
    domainContext: `A dry cleaning business receives garments from customers, processes them through cleaning and pressing stages, and notifies customers when ready for pickup. Key metrics: turnaround time, items per ticket, revenue per ticket. Staff track garments through production stages. Customers care most about pickup notifications to avoid wasted trips. Use the word "ticket" not "order" and "garment" not "item" throughout the UI.`,
  },

  shoe_repair: {
    id: 'shoe_repair', name: 'Shoe Repair', emoji: '👞',
    tagline: 'Manage repair jobs from intake to collection',
    terminology: {
      order: 'job', orders: 'jobs', item: 'pair', items: 'pairs',
      customer: 'customer', customers: 'customers', staff: 'cobbler',
      ready: 'repair complete', intake: 'intake',
    },
    workflowStages: [
      { id: 'received', label: 'Received' }, { id: 'assessment', label: 'Assessment' },
      { id: 'repair', label: 'In Repair' }, { id: 'polish', label: 'Polish & Finish' },
      { id: 'quality_check', label: 'Quality Check' }, { id: 'ready', label: 'Ready for Collection' },
      { id: 'collected', label: 'Collected' },
    ],
    defaultServices: [
      { name: 'Heel replacement (pair)', basePrice: 22.00 },
      { name: 'Sole replacement (pair)', basePrice: 45.00 },
      { name: 'Full resole (leather)', basePrice: 85.00 },
      { name: 'Zipper replacement', basePrice: 28.00 },
      { name: 'Leather conditioning', basePrice: 18.00 },
      { name: 'Polish & shine', basePrice: 12.00 },
      { name: 'Stitching repair', basePrice: 15.00 },
    ],
    sampleCustomers: [
      { name: 'Robert Kim', phone: '(555) 234-5678', email: 'rkim@email.com', notes: 'Vintage Oxfords — handle with care' },
      { name: 'Sarah Thompson', phone: '(555) 345-6789', email: 's.thompson@email.com', notes: 'Text notification preferred' },
      { name: 'David Martinez', phone: '(555) 456-7890', email: 'dmartinez@email.com', notes: 'Monthly running shoe maintenance' },
    ],
    painPoints: [
      'No system to track which shoes belong to which customer',
      'Forgetting to notify customers when repairs are done',
      'No record of repair history for repeat customers',
      'Difficulty estimating time for complex jobs',
    ],
    domainContext: `A shoe repair shop takes in shoes and leather goods for repair, resoling, and restoration. Jobs range from quick heel replacements (same day) to complex restorations (1-2 weeks). Customers leave items and return later — notification when ready is critical. Use "job" not "order" and "pair" not "item". Cobblers need to track which repairs are assigned to them.`,
  },

  tailoring: {
    id: 'tailoring', name: 'Tailoring & Alterations', emoji: '✂️',
    tagline: 'Track alterations from fitting to final collection',
    terminology: {
      order: 'alteration', orders: 'alterations', item: 'garment', items: 'garments',
      customer: 'client', customers: 'clients', staff: 'tailor',
      ready: 'alterations complete', intake: 'fitting appointment',
    },
    workflowStages: [
      { id: 'fitting', label: 'Fitting' }, { id: 'pinned', label: 'Pinned & Ready' },
      { id: 'sewing', label: 'Sewing' }, { id: 'pressing', label: 'Pressing' },
      { id: 'second_fitting', label: '2nd Fitting' }, { id: 'ready', label: 'Ready for Collection' },
      { id: 'collected', label: 'Collected' },
    ],
    defaultServices: [
      { name: 'Hem (pants)', basePrice: 18.00 },
      { name: 'Hem (dress/skirt)', basePrice: 22.00 },
      { name: 'Waist taken in/out', basePrice: 28.00 },
      { name: 'Jacket sleeves shortened', basePrice: 38.00 },
      { name: 'Zipper replacement', basePrice: 25.00 },
      { name: 'Wedding dress alteration', basePrice: 150.00 },
      { name: 'Full suit alteration', basePrice: 120.00 },
    ],
    sampleCustomers: [
      { name: 'Emma Rodriguez', phone: '(555) 234-5678', email: 'emma.r@email.com', notes: 'Wedding June — bridal party of 6' },
      { name: 'Michael Park', phone: '(555) 345-6789', email: 'mpark@email.com', notes: 'Suits altered for new job' },
      { name: 'Jennifer Walsh', phone: '(555) 456-7890', email: 'j.walsh@email.com', notes: 'Measurements on file — size 8' },
    ],
    painPoints: [
      'Keeping track of client measurements and fitting notes',
      'Managing deadline pressure for weddings and events',
      'Scheduling fitting appointments around alteration workflow',
      'Misplaced garments between fittings',
    ],
    domainContext: `A tailoring and alterations business takes clothing from clients, makes adjustments, and returns them ready to wear. Jobs range from simple hems (1-2 days) to full wedding dress alterations (weeks). Client measurements are recurring valuable data. Deadlines for weddings/events create urgency. Use "alteration" not "order", "client" not "customer", "tailor" not "staff".`,
  },

  watch_repair: {
    id: 'watch_repair', name: 'Watch & Jewelry Repair', emoji: '⌚',
    tagline: 'Track high-value repair jobs with quote approval',
    terminology: {
      order: 'job', orders: 'jobs', item: 'piece', items: 'pieces',
      customer: 'customer', customers: 'customers', staff: 'watchmaker',
      ready: 'repair complete', intake: 'intake',
    },
    workflowStages: [
      { id: 'received', label: 'Received' }, { id: 'diagnosis', label: 'Diagnosis' },
      { id: 'quote_sent', label: 'Quote Sent' }, { id: 'approved', label: 'Approved' },
      { id: 'repair', label: 'In Repair' }, { id: 'testing', label: 'Testing' },
      { id: 'ready', label: 'Ready for Collection' }, { id: 'collected', label: 'Collected' },
    ],
    defaultServices: [
      { name: 'Battery replacement', basePrice: 15.00 },
      { name: 'Crystal replacement', basePrice: 45.00 },
      { name: 'Strap replacement (leather)', basePrice: 35.00 },
      { name: 'Full service (mechanical)', basePrice: 180.00 },
      { name: 'Clasp repair', basePrice: 25.00 },
      { name: 'Ring resize', basePrice: 55.00 },
      { name: 'Polishing service', basePrice: 40.00 },
    ],
    sampleCustomers: [
      { name: 'Thomas Anderson', phone: '(555) 234-5678', email: 't.anderson@email.com', notes: 'Vintage Rolex — specialist care required' },
      { name: 'Patricia Moore', phone: '(555) 345-6789', email: 'pmoore@email.com', notes: 'Inherited jewelry collection' },
      { name: 'George Williams', phone: '(555) 456-7890', email: 'gwilliams@email.com', notes: 'Insurance claim — needs documentation' },
    ],
    painPoints: [
      'High-value items need careful intake documentation and security',
      'Customers must approve quotes before work begins',
      'Insurance documentation requirements for valuable pieces',
      'No digital record of diagnostic findings',
    ],
    domainContext: `A watch and jewelry repair business handles high-value items requiring careful documentation at intake. Quotes must be sent to customers for approval before work begins. Insurance documentation is often required. Items have significant monetary and sentimental value. Use "job" not "order", "piece" not "item". The quote-approval workflow stage is unique to this vertical.`,
  },

  auto_detailing: {
    id: 'auto_detailing', name: 'Auto Detailing', emoji: '🚗',
    tagline: 'Book and track detailing jobs from arrival to delivery',
    terminology: {
      order: 'booking', orders: 'bookings', item: 'vehicle', items: 'vehicles',
      customer: 'customer', customers: 'customers', staff: 'detailer',
      ready: 'detail complete', intake: 'vehicle arrival',
    },
    workflowStages: [
      { id: 'booked', label: 'Booked' }, { id: 'arrived', label: 'Vehicle Arrived' },
      { id: 'interior', label: 'Interior Detail' }, { id: 'exterior', label: 'Exterior Wash' },
      { id: 'polish', label: 'Polish / Wax' }, { id: 'final_check', label: 'Final Inspection' },
      { id: 'ready', label: 'Ready for Pickup' }, { id: 'delivered', label: 'Delivered' },
    ],
    defaultServices: [
      { name: 'Basic wash & vacuum', basePrice: 45.00 },
      { name: 'Full interior detail', basePrice: 120.00 },
      { name: 'Full exterior detail', basePrice: 150.00 },
      { name: 'Complete detail (in + out)', basePrice: 250.00 },
      { name: 'Paint correction', basePrice: 350.00 },
      { name: 'Ceramic coating', basePrice: 800.00 },
      { name: 'Odor elimination', basePrice: 75.00 },
    ],
    sampleCustomers: [
      { name: 'Chris Johnson', phone: '(555) 234-5678', email: 'cjohnson@email.com', notes: '2022 Tesla Model 3 — ceramic coating' },
      { name: 'Amanda Foster', phone: '(555) 345-6789', email: 'afoster@email.com', notes: 'Monthly maintenance customer' },
      { name: 'Brian Taylor', phone: '(555) 456-7890', email: 'btaylor@email.com', notes: 'Fleet account — 3 company vehicles' },
    ],
    painPoints: [
      'Scheduling conflicts when multiple vehicles arrive at the same time',
      'No digital record of what services were done on each vehicle',
      'Customers arriving without confirmed bookings',
      'Tracking which detailer is assigned to which vehicle',
    ],
    domainContext: `An auto detailing business books vehicles for cleaning, polishing, and protection services. Jobs are appointment-based and time-boxed (2-8 hours per vehicle). Staff capacity limits vehicles per day. Before/after photo documentation matters for high-end work. Fleet accounts (multiple vehicles from one business) are common. Use "booking" not "order", "vehicle" not "item", "detailer" not "staff".`,
  },
};

export function getVertical(id: string): VerticalConfig | null {
  return VERTICALS[id] ?? null;
}

export const ALL_VERTICALS = Object.values(VERTICALS);
