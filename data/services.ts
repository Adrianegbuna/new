export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const services: Service[] = [
  {
    id: '1',
    name: 'Solar Panel Installation',
    category: 'Installation',
    description: 'Professional installation of high-quality solar panels for residential and commercial properties.'
  },
  {
    id: '2',
    name: 'Solar System Maintenance',
    category: 'Maintenance',
    description: 'Regular maintenance and inspection of solar panel systems to ensure optimal performance.'
  },
  {
    id: '3',
    name: 'Battery Storage Setup',
    category: 'Installation',
    description: 'Installation and configuration of energy storage systems for backup power and load shifting.'
  },
  {
    id: '4',
    name: 'Inverter Installation',
    category: 'Installation',
    description: 'Professional installation of solar inverters to convert DC to AC power efficiently.'
  },
  {
    id: '5',
    name: 'System Monitoring',
    category: 'Service',
    description: 'Real-time monitoring and diagnostics of your renewable energy system performance.'
  },
  {
    id: '6',
    name: 'Energy Audit',
    category: 'Consultation',
    description: 'Comprehensive assessment of your energy usage and recommendations for solar solutions.'
  },
  {
    id: '7',
    name: 'Grid Connection Setup',
    category: 'Installation',
    description: 'Setup and compliance for grid-tied solar systems with proper metering and safety features.'
  },
  {
    id: '8',
    name: 'Repair & Troubleshooting',
    category: 'Service',
    description: 'Quick repair services and troubleshooting for underperforming solar systems.'
  },
  {
    id: '9',
    name: 'System Expansion',
    category: 'Installation',
    description: 'Expand your existing renewable energy system with additional panels or storage capacity.'
  },
  {
    id: '10',
    name: 'Certification & Inspection',
    category: 'Consultation',
    description: 'Professional inspection and certification of renewable energy installations for safety compliance.'
  },
];
