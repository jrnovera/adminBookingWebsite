// Mirrors the service catalogue on the public booking site so walk-in
// bookings created here match what customers can book online.
export type ServiceOption = {
  id: string;
  name: string;
  duration: number;
  price: number;
};

export const services: ServiceOption[] = [
  {
    id: "womens-haircut",
    name: "Women's Haircut & Blow Dry",
    duration: 60,
    price: 65,
  },
  { id: "balayage", name: "Balayage / Highlights", duration: 120, price: 150 },
  { id: "keratin", name: "Keratin Treatment", duration: 90, price: 120 },
  { id: "gel-manicure", name: "Gel Manicure", duration: 45, price: 40 },
  { id: "classic-pedicure", name: "Classic Pedicure", duration: 60, price: 50 },
  { id: "deep-tissue", name: "Deep Tissue Massage", duration: 60, price: 80 },
];
