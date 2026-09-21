import { db } from "../src/lib/db";

const CUSTOMERS = [
  { name: "Abena Owusu", phone: "+233 24 112 8845", email: "abena.owusu@gmail.com", gender: "Female", occupation: "Lawyer", city: "Accra", country: "Ghana", entrySource: "Referral", referredBy: "Mama Esi", customerType: "VIP", preferredStyles: "Classic,Elegant", favouriteColours: "Burgundy, Navy, Gold", coloursToAvoid: "Neon", favouriteFabrics: "Silk, Lace, Kente", preferredFit: "Fitted", designPreferences: "Off-shoulder necklines, mermaid silhouette", styleNotes: "Loves statement pieces. Prefers modest but dramatic." },
  { name: "Kwame Mensah", phone: "+233 20 778 2210", email: "k.mensah@outlook.com", gender: "Male", occupation: "Banker", city: "Kumasi", country: "Ghana", entrySource: "Instagram", customerType: "Corporate", preferredStyles: "Classic,Modern", favouriteColours: "Charcoal, Black, Navy", favouriteFabrics: "Wool, Cotton", preferredFit: "Regular", designPreferences: "Slim-fit suits, double-breasted blazers" },
  { name: "Ama Serwaa", phone: "+233 55 904 1167", email: "ama.serwaa@yahoo.com", gender: "Female", occupation: "Event Planner", city: "Accra", country: "Ghana", entrySource: "Walk-in", customerType: "Bridal", preferredStyles: "Dramatic,Elegant", favouriteColours: "Ivory, Blush, Champagne", coloursToAvoid: "Black", favouriteFabrics: "Tulle, Satin, Chiffon", preferredFit: "Bodycon", designPreferences: "Ball gown, corset bodice, cathedral train" },
  { name: "Yaw Boateng", phone: "+233 27 330 5589", email: "yaw.boateng@gmail.com", gender: "Male", occupation: "Architect", city: "Takoradi", country: "Ghana", entrySource: "Repeat Client", customerType: "Returning Customer", preferredStyles: "Minimal,Classic", favouriteColours: "Olive, Camel, Cream", favouriteFabrics: "Linen, Cotton", preferredFit: "Relaxed", designPreferences: "Agbada, kaftan cuts" },
  { name: "Esi Owusu-Darko", phone: "+233 24 556 7700", email: "esi.darko@gmail.com", gender: "Female", occupation: "Doctor", city: "Accra", country: "Ghana", entrySource: "Referral", referredBy: "Abena Owusu", customerType: "Occasion Wear", preferredStyles: "Elegant,Modest", favouriteColours: "Emerald, Plum, Teal", coloursToAvoid: "Yellow", favouriteFabrics: "Crepe, Velvet", preferredFit: "Semi-Fitted", designPreferences: "Long sleeves, high neck, A-line" },
  { name: "Kofi Asante", phone: "+233 20 889 4412", email: "kofi.asante@gmail.com", gender: "Male", occupation: "Entrepreneur", city: "Accra", country: "Ghana", entrySource: "Saw Our Work", customerType: "Regular Wear", preferredStyles: "Trendy,Modern", favouriteColours: "Black, White, Burgundy", favouriteFabrics: "Cotton, Denim", preferredFit: "Fitted", designPreferences: "Tailored shirts, fitted trousers" },
  { name: "Akosua Frimpong", phone: "+233 55 220 8890", email: "akosua.f@gmail.com", gender: "Female", occupation: "Journalist", city: "Kumasi", country: "Ghana", entrySource: "Facebook", customerType: "Occasion Wear", preferredStyles: "Modern,Trendy", favouriteColours: "Royal Blue, Red", favouriteFabrics: "Satin, Silk", preferredFit: "Fitted", designPreferences: "Slit and kaba, off-shoulder" },
  { name: "Nana Kwame", phone: "+233 27 145 6678", email: "nana.kwame@outlook.com", gender: "Male", occupation: "Chef", city: "Accra", country: "Ghana", entrySource: "WhatsApp", customerType: "Regular Wear", preferredStyles: "Traditional,Classic", favouriteColours: "Earth tones", favouriteFabrics: "Kente, Cotton", preferredFit: "Regular", designPreferences: "Smock, traditional wear" },
];

const STAFF = [
  { email: "madam@studio.com", fullName: "Madam Adwoa", role: "madam", gender: "Female", phone: "+233 24 000 0001", password: "atelier2025" },
  { email: "akos@studio.com", fullName: "Akos Mansa", role: "staff", gender: "Female", phone: "+233 24 000 0002", password: "atelier2025" },
  { email: "yaw@studio.com", fullName: "Yaw Kofi", role: "staff", gender: "Male", phone: "+233 24 000 0003", password: "atelier2025" },
  { email: "esi@studio.com", fullName: "Esi Boatema", role: "staff", gender: "Female", phone: "+233 24 000 0004", password: "atelier2025" },
];

const GARMENTS = [
  "Burgundy mermaid gown with beaded bodice",
  "Ivory bridal ball gown with cathedral train",
  "Charcoal three-piece suit, double-breasted",
  "Emergreen A-line evening dress, high neck",
  "Royal blue slit and kaba set",
  "Camel linen agbada with gold embroidery",
  "Black tailored shirt and trousers",
  "Plum velvet midi dress, long sleeves",
  "Navy kaftan with minimal detailing",
  "Champagne sequin sheath dress",
];

const STATUSES = [
  "Enquiry", "Quoted", "Consultation", "Confirmed", "Deposit Paid",
  "In Production", "Fitting", "Alterations", "Ready", "Collected/Delivered", "Completed",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  console.log("Seeding Madam Studio...");

  // Wipe
  await db.customerFeedback.deleteMany();
  await db.styleConcept.deleteMany();
  await db.measurementSet.deleteMany();
  await db.task.deleteMany();
  await db.fitting.deleteMany();
  await db.payment.deleteMany();
  await db.order.deleteMany();
  await db.customer.deleteMany();
  await db.user.deleteMany();
  await db.settings.deleteMany();

  // Staff
  const users = [];
  for (const s of STAFF) {
    users.push(await db.user.create({ data: s }));
  }
  const madam = users[0];
  const staff = users.slice(1);

  // Settings
  await db.settings.create({
    data: { ownerGender: "Madam", studioName: "Madam Studio", overheadAmount: 3500, selfPayout: 2000, currency: "GHS" },
  });

  // Customers
  const customers = [];
  for (const c of CUSTOMERS) {
    customers.push(await db.customer.create({ data: { ...c, status: "Active" } }));
  }

  // Orders — spread across statuses and the last ~5 months
  const now = new Date();
  const orders = [];
  for (let i = 0; i < 28; i++) {
    const cust = pick(customers, i);
    const garment = pick(GARMENTS, i);
    const status = pick(STATUSES, i + 2);
    const assignedStaff = pick(staff, i);
    const orderDate = new Date(now.getFullYear(), now.getMonth() - (i % 5), (i % 27) + 1);
    const deliveryDate = new Date(orderDate.getTime() + 1000 * 60 * 60 * 24 * (14 + (i % 21)));
    const sellingPrice = 800 + (i % 12) * 350;
    const fabricCost = Math.round(sellingPrice * 0.22);
    const labourCost = Math.round(sellingPrice * 0.28);
    const priority = i % 7 === 0 ? "High" : i % 3 === 0 ? "Low" : "Medium";

    const order = await db.order.create({
      data: {
        customerId: cust.id,
        garmentDesign: garment,
        orderDate,
        deliveryDate,
        status,
        assignedStaffId: assignedStaff.id,
        sellingPrice,
        fabricCost,
        labourCost,
        priority,
        notes: i % 4 === 0 ? "Client requested rush processing." : null,
      },
    });
    orders.push(order);

    // Payments — deposit + maybe balance for orders past confirmed
    const statusIdx = STATUSES.indexOf(status);
    if (statusIdx >= 4) {
      // Deposit paid
      await db.payment.create({
        data: {
          orderId: order.id,
          amount: Math.round(sellingPrice * 0.5),
          method: i % 2 === 0 ? "Transfer" : "Cash",
          date: new Date(orderDate.getTime() + 1000 * 60 * 60 * 24 * 2),
          note: "50% deposit",
        },
      });
      if (statusIdx >= 9) {
        // Balance on collection
        await db.payment.create({
          data: {
            orderId: order.id,
            amount: Math.round(sellingPrice * 0.5),
            method: i % 2 === 0 ? "Cash" : "Transfer",
            date: new Date(deliveryDate.getTime()),
            note: "Final balance",
          },
        });
      }
    }

    // Fittings for in-production+ orders
    if (statusIdx >= 5 && statusIdx <= 8) {
      await db.fitting.create({
        data: {
          orderId: order.id,
          date: new Date(orderDate.getTime() + 1000 * 60 * 60 * 24 * (7 + (i % 10))),
          status: statusIdx >= 7 ? "Completed" : "Scheduled",
          notes: i % 3 === 0 ? "Check bodice fit." : null,
        },
      });
    }

    // Tasks for active orders
    if (["In Production", "Fitting", "Alterations", "Confirmed", "Deposit Paid"].includes(status)) {
      await db.task.create({
        data: {
          title: i % 2 === 0 ? "Cut fabric panels" : "First fitting preparation",
          orderId: order.id,
          staffId: assignedStaff.id,
          status: i % 3 === 0 ? "Done" : i % 3 === 1 ? "In Progress" : "To Do",
          priority,
          dueDate: new Date(orderDate.getTime() + 1000 * 60 * 60 * 24 * 5),
        },
      });
    }
  }

  // Measurements for first 5 customers
  for (let i = 0; i < 5; i++) {
    await db.measurementSet.create({
      data: {
        customerId: customers[i].id,
        staffId: pick(staff, i).id,
        dateTaken: new Date(now.getFullYear(), now.getMonth() - 2, (i + 5)),
        bust: 88 + i * 3,
        waist: 70 + i * 2,
        hip: 96 + i * 3,
        shoulder: 38 + i,
        length: 150 + i * 2,
        sleeve: 58 + i,
        notes: "Standard proportions.",
      },
    });
  }

  // A couple of approved style concepts
  await db.styleConcept.create({
    data: {
      customerId: customers[0].id,
      garmentType: "Evening Gown",
      occasion: "Wedding Guest",
      desiredLook: "Elegant, dramatic",
      season: "Dry Season",
      budget: 2500,
      colourPreference: "Burgundy",
      conceptName: "Burgundy Mermaid with Beaded Bodice",
      silhouette: "Mermaid",
      neckline: "Off-shoulder",
      sleeveStyle: "Cap sleeve",
      length: "Floor-length",
      fabric: "Silk crepe with beaded lace",
      colour: "Burgundy",
      detailing: "Hand-beaded bodice, sweep train",
      embellishment: "Seed pearls and crystals",
      whyThisMayWork: "Aligns with client's love of burgundy and statement pieces; mermaid flatters her defined waist.",
      fitConsiderations: "Slight boning needed at bodice for support.",
      matchPercent: 92,
      designDirection: "Keep embellishment concentrated above the waist to balance the flare.",
      status: "Approved",
      dataConfidence: "Complete",
    },
  });
  await db.styleConcept.create({
    data: {
      customerId: customers[2].id,
      garmentType: "Bridal Gown",
      occasion: "Wedding",
      desiredLook: "Romantic, grand",
      season: "Dry Season",
      budget: 6000,
      colourPreference: "Ivory",
      conceptName: "Ivory Ball Gown with Corset Bodice",
      silhouette: "Ball gown",
      neckline: "Sweetheart",
      sleeveStyle: "Strapless",
      length: "Cathedral train",
      fabric: "Tulle and satin",
      colour: "Ivory",
      detailing: "Corset bodice, layered tulle skirt",
      embellishment: "Lace appliqué, pearl beading",
      whyThisMayWork: "Matches her bridal brief and love of dramatic silhouettes; ivory and tulle align with her palette.",
      fitConsiderations: "Boned corset; measurements needed at bust and waist.",
      matchPercent: 88,
      designDirection: "Keep skirt volume balanced with a defined waist.",
      status: "Approved",
      dataConfidence: "Good",
    },
  });

  // Feedback
  await db.customerFeedback.create({ data: { customerId: customers[0].id, rating: 5, type: "General", feedback: "Absolutely loved the gown. Perfect fit!" } });
  await db.customerFeedback.create({ data: { customerId: customers[1].id, rating: 4, type: "Fitting", feedback: "Trousers slightly long, otherwise great." } });
  await db.customerFeedback.create({ data: { customerId: customers[4].id, rating: 5, type: "Delivery", feedback: "On time and beautifully finished." } });

  console.log(`Seeded ${users.length} staff, ${customers.length} customers, ${orders.length} orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
