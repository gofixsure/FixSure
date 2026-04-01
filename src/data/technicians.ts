export interface Technician {
  id: string;
  name: string;
  shopName: string;
  city: string;
  category: string;
  experience: number;
  reliabilityScore: number;
  totalRepairs: number;
  avgRating: number;
  claimRate: number;
  verified: boolean;
}

export const technicians: Technician[] = [
  { id: "1", name: "Ramesh Kumar", shopName: "Ramesh Mobile Repair", city: "Hyderabad", category: "Mobile Repair", experience: 8, reliabilityScore: 92, totalRepairs: 1240, avgRating: 4.6, claimRate: 2.1, verified: true },
  { id: "2", name: "Suresh Patel", shopName: "Suresh Electronics", city: "Mumbai", category: "Laptop Repair", experience: 12, reliabilityScore: 88, totalRepairs: 860, avgRating: 4.4, claimRate: 3.5, verified: true },
  { id: "3", name: "Priya Sharma", shopName: "TechFix Hub", city: "Bangalore", category: "Tablet Repair", experience: 5, reliabilityScore: 95, totalRepairs: 540, avgRating: 4.8, claimRate: 1.2, verified: true },
  { id: "4", name: "Anil Reddy", shopName: "Quick Fix Electronics", city: "Hyderabad", category: "Electronics Repair", experience: 15, reliabilityScore: 90, totalRepairs: 2100, avgRating: 4.5, claimRate: 2.8, verified: true },
  { id: "5", name: "Deepa Nair", shopName: "Deepa Phone Clinic", city: "Chennai", category: "Mobile Repair", experience: 6, reliabilityScore: 94, totalRepairs: 780, avgRating: 4.7, claimRate: 1.5, verified: true },
  { id: "6", name: "Vikram Singh", shopName: "Gadget Guru", city: "Delhi", category: "Laptop Repair", experience: 10, reliabilityScore: 87, totalRepairs: 1560, avgRating: 4.3, claimRate: 4.0, verified: true },
];

export const cities = ["All Cities", "Hyderabad", "Mumbai", "Bangalore", "Chennai", "Delhi"];
export const categories = ["All Categories", "Mobile Repair", "Laptop Repair", "Tablet Repair", "Electronics Repair"];
