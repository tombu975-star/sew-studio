import { db } from "../src/lib/db";

const CUSTOMERS = [
  { name: "Abena Owusu", phone: "+233 24 112 8845", whatsapp: "+233 24 112 8845", email: "abena.owusu@gmail.com", gender: "Female", occupation: "Lawyer", city: "Accra", country: "Ghana", entrySource: "Referral", referredBy: "Mama Esi", customerType: "VIP", preferredStyles: "Classic,Elegant", favouriteColours: "Burgundy, Navy, Gold", coloursToAvoid: "Neon", favouriteFabrics: "Silk, Lace, Kente", preferredFit: "Fitted", designPreferences: "Off-shoulder necklines, mermaid silhouette", styleNotes: "Loves statement pieces. Prefers modest but dramatic." },
  { name: "Kwame Mensah", phone: "+233 20 778 2210", whatsapp: "+233 20 778 2210", email: "k.mensah@outlook.com", gender: "Male", occupation: "Banker", city: "Kumasi", country: "Ghana", entrySource: "Instagram", customerType: "Corporate", preferredStyles: "Classic,Modern", favouriteColours: "Charcoal, Black, Navy", favouriteFabrics: "Wool, Cotton", preferredFit: "Regular", designPreferences: "Slim-fit suits, double-breasted blazers" },
  { name: "Ama Serwaa", phone: "+233 55 904 1167", email: "ama.serwaa@yahoo.com", gender: "Female", occupation: "Event Planner", city: "Accra", country: "Ghana", entrySource: "Walk-in", customerType: "Bridal", preferredStyles: "Dramatic,Elegant", favouriteColours: "Ivory, Blush, Champagne", coloursToAvoid: "Black", favouriteFabrics: "Tulle, Satin, Chiffon", preferredFit: "Bodycon", designPreferences: "Ball gown, corset bodice, cathedral train" },
  { name: "Yaw Boateng", phone: "+233 27 330 5589", email: "yaw.boateng@gmail.com", gender: "Male", occupation: "Architect", city: "Takoradi", country: "Ghana", entrySource: "Repeat Client", customerType: "Returning Customer", preferredStyles: "Minimal,Classic", favouriteColours: "Olive, Camel, Cream", favouriteFabrics: "Linen, Cotton", preferredFit: "Relaxed", designPreferences: "Agbada, kaftan cuts" },
  { name: "Esi Owusu-Darko", phone: "+233 24 556 7700", email: "esi.darko@gmail.com", gender: "Female", occupation: "Doctor", city: "Accra", country: "Ghana", entrySource: "Referral", referredBy: "Abena Owusu", customerType: "Occasion Wear", preferredStyles: "Elegant,Modest", favouriteColours: "Emerald, Plum, Teal", coloursToAvoid: "Yellow", favouriteFabrics: "Crepe, Velvet", preferredFit: "Semi-Fitted", designPreferences: "Long sleeves, high neck, A-line" },
  { name: "Kofi Asante", phone: "+233 20 889 4412", email: "kofi.asante@gmail.com", gender: "Male", occupation: "Entrepreneur", city: "Accra", country: "Ghana", entrySource: "Saw Our Work", customerType: "Regular Wear", preferredStyles: "Trendy,Modern", favouriteColours: "Black, White, Burgundy", favouriteFabrics: "Cotton, Denim", preferredFit: "Fitted", designPreferences: "Tailored shirts, fitted trousers" },
  { name: "Akosua Frimpong", phone: "+233 55 220 8890", email: "akosua.f@gmail.com", gender: "Female", occupation: "Journalist", city: "Kumasi", country: "Ghana", entrySource: "Facebook", customerType: "Occasion Wear", preferredStyles: "Modern,Trendy", favouriteColours: "Royal Blue, Red", favouriteFabrics: "Satin, Silk", preferredFit: "Fitted", designPreferences: "Slit and kaba, off-shoulder" },
  { name: "Nana Kwame", phone: "+233 27 145 6678", email: "nana.kwame@outlook.com", gender: "Male", occupation: "Chef", city: "Accra", country: "Ghana", entrySource: "WhatsApp", customerType: "Regular Wear", preferredStyles: "Traditional,Classic", favouriteColours: "Earth tones", favouriteFabrics: "Kente, Cotton", preferredFit: "Regular", designPreferences: "Smock, traditional wear" },
];

const STAFF = [
  { email: "madam@studio.com", fullName: "Madam Adwoa", role: "madam", gender: "Female", phone: "+233 24 000 0001", password: "atelier2025" },
  { email: "staff@studio.com", fullName: "Akos Mansa", role: "staff", gender: "Female", phone: "+233 24 000 0002", password: "atelier2025" },
  { email: "yaw@studio.com", fullName: "Yaw Kofi", role: "staff", gender: "Male", phone: "+233 24 000 0003", password: "atelier2025" },
  { email: "esi@studio.com", fullName: "Esi Boatema", role: "staff", gender: "Female", phone: "+233 24 000 0004", password: "atelier2025" },
  { email: "trainer@studio.com", fullName: "Coach Afia", role: "trainer", gender: "Female", phone: "+233 24 000 0005", password: "atelier2025" },
  { email: "trainee@studio.com", fullName: "Ama Trainee", role: "trainee", gender: "Female", phone: "+233 24 000 0006", password: "atelier2025" },
  { email: "kojo@studio.com", fullName: "Kojo Trainee", role: "trainee", gender: "Male", phone: "+233 24 000 0007", password: "atelier2025" },
  { email: "freelancer@studio.com", fullName: "Mama Esi Beadworks", role: "freelancer", gender: "Female", phone: "+233 24 111 2233", password: "atelier2025" },
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
  await db.customerNotification.deleteMany();
  await db.certificate.deleteMany();
  await db.trainingLog.deleteMany();
  await db.communityLike.deleteMany();
  await db.communityComment.deleteMany();
  await db.communityPost.deleteMany();
  await db.freelanceJob.deleteMany();
  await db.freelancerShopLink.deleteMany();
  await db.freelancerAccount.deleteMany();
  await db.customerFeedback.deleteMany();
  await db.styleConcept.deleteMany();
  await db.measurementSet.deleteMany();
  await db.task.deleteMany();
  await db.fitting.deleteMany();
  await db.payment.deleteMany();
  await db.order.deleteMany();
  await db.customer.deleteMany();
  await db.competencyUnit.deleteMany();
  await db.trainingProgram.deleteMany();
  await db.user.deleteMany();
  await db.settings.deleteMany();
  await db.shop.deleteMany();

  // Tenant — the atelier shop
  const shop = await db.shop.create({
    data: { name: "Madam Studio", slug: "madam-studio", plan: "pro", currency: "GHS" },
  });
  const shopId = shop.id;

  // Staff (all belong to this shop)
  const users = [];
  for (const s of STAFF) {
    users.push(await db.user.create({ data: { ...s, shopId } }));
  }
  const madam = users[0];
  const staff = users.filter((u) => u.role === "staff" || u.role === "freelancer");
  const trainer = users.find((u) => u.role === "trainer");
  const trainees = users.filter((u) => u.role === "trainee");

  // Assign mentors + training duration to trainees (school-portal style)
  if (trainer) {
    for (let i = 0; i < trainees.length; i++) {
      await db.user.update({
        where: { id: trainees[i].id },
        data: {
          mentorId: trainer.id,
          trainingDurationWeeks: 12,
          trainingStartedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * (8 - i * 2)), // started 8 / 6 weeks ago
          // Kojo (further along) gets production access; Ama (newer) doesn't yet.
          canAccessOrders: i === 1,
          canAccessBoard: i === 1,
        },
      });
    }
  }

  // Settings
  await db.settings.create({
    data: { shopId, ownerGender: "Madam", studioName: "Madam Studio", overheadAmount: 3500, selfPayout: 2000, currency: "GHS" },
  });

  // Customers
  const customers = [];
  for (const c of CUSTOMERS) {
    customers.push(await db.customer.create({ data: { ...c, shopId, status: "Active" } }));
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
        shopId,
        customerId: cust.id,
        garmentDesign: garment,
        designImage: (status === "Completed" || status === "Collected/Delivered") && i < 10
          ? `https://images.unsplash.com/photo-${["1544510106-51d0ee2e1b32","1490481651871-ab68de25d43d","1469334021218-9f8b415a7c95","1551232864-3f0890e580d9","1595777216528-07169e1c14bc"][i % 5]}?w=800&q=80`
          : null,
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
          shopId,
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
        shopId,
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
      shopId,
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
      shopId,
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
  await db.customerFeedback.create({ data: { shopId, customerId: customers[0].id, rating: 5, type: "General", feedback: "Absolutely loved the gown. Perfect fit!" } });
  await db.customerFeedback.create({ data: { shopId, customerId: customers[1].id, rating: 4, type: "Fitting", feedback: "Trousers slightly long, otherwise great." } });
  await db.customerFeedback.create({ data: { shopId, customerId: customers[4].id, rating: 5, type: "Delivery", feedback: "On time and beautifully finished." } });

  // Freelancers — trusted specialists the studio commissions per-piece
  const FREELANCERS = [
    { fullName: "Mama Esi Beadworks", specialty: "Beader", skills: "Hand-beading, crystal work, pearl setting", phone: "+233 24 111 2233", email: "esi.beads@gmail.com", rateNotes: "GHS 400 - Fast turnaround on bodice beading. Did Abena's mermaid gown.", status: "Available" },
    { fullName: "Kweku Laceworks", specialty: "Embroiderer", skills: "Lace appliqué, thread painting", phone: "+233 20 445 7788", email: "kweku.lace@gmail.com", rateNotes: "GHS 300 - Currently on a 2-week bridal commission.", status: "Busy" },
    { fullName: "Adwoa Cutter", specialty: "Cutter", skills: "Pattern cutting, toile, fitting", phone: "+233 27 902 1145", email: "adwoa.cutter@gmail.com", rateNotes: "GHS 250 - Excellent with structured tailoring.", status: "Available" },
    { fullName: "Studio Lume", specialty: "Photographer", skills: "Lookbook, editorial, product", phone: "+233 55 700 3322", email: "hello@studiolume.com", rateNotes: "GHS 600 - Shoots our portfolio pieces. Books 1 week ahead.", status: "Available" },
    { fullName: "Nana Tailoring", specialty: "Tailor", skills: "Suits, agbada, menswear", phone: "+233 24 668 9900", email: "nana.tailor@gmail.com", rateNotes: "GHS 350 - Travelling until next month.", status: "Unavailable" },
  ];
  for (const f of FREELANCERS) {
    const acc = await db.freelancerAccount.create({
      data: {
        fullName: f.fullName,
        email: f.email,
        phone: f.phone,
        specialty: f.specialty,
        skills: f.skills,
        password: "atelier2025",
      },
    });
    await db.freelancerShopLink.create({
      data: {
        shopId,
        freelancerId: acc.id,
        rateNotes: f.rateNotes,
        status: f.status,
      },
    });
  }

  // Community feed — the studio's internal wall
  const COMMUNITY = [
    { authorId: madam.id, authorName: madam.fullName, authorRole: "madam", type: "announcement", title: "Welcome to the studio wall", body: "This is our space for updates, questions, inspiration and showcases. Post freely — what you're working on, a fabric you love, or a question for the team.", pinned: true, createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5) },
    { authorId: staff[0].id, authorName: staff[0].fullName, authorRole: "staff", type: "showcase", title: "Finished Abena's mermaid gown today", body: "The beaded bodice came out stunning. Mama Esi outdid herself. Fitting is perfect — client collects Friday.", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2) },
    { authorId: staff[1].id, authorName: staff[1].fullName, authorRole: "staff", type: "question", title: "Best source for Italian lace?", body: "I have a bridal client who wants genuine Italian lace for her bodice. Anyone worked with a reliable supplier recently?", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24) },
    { authorId: staff[2].id, authorName: staff[2].fullName, authorRole: "staff", type: "inspiration", body: "Saw the most beautiful coral-and-gold kente combo at a wedding this weekend. Going to try a modern slit-and-kaba interpretation for the portfolio. ✨", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 8) },
    { authorId: madam.id, authorName: madam.fullName, authorRole: "madam", type: "update", title: "New commission guidelines", body: "From next week: all custom orders over GHS 2,000 need a 50% deposit before we cut fabric. Let's protect the studio's cash flow. Questions, come find me.", createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 3) },
  ];
  const posts = [];
  for (const p of COMMUNITY) {
    posts.push(await db.communityPost.create({ data: { ...p, shopId } }));
  }
  // a couple of comments + likes
  await db.communityComment.create({ data: { postId: posts[1].id, authorName: madam.fullName, authorId: madam.id, body: "Beautiful work. Let's get a photo for the portfolio." } });
  await db.communityComment.create({ data: { postId: posts[2].id, authorName: staff[2].fullName, authorId: staff[2].id, body: "There's a supplier on Oxford Street — I'll share his contact." } });
  await db.communityLike.create({ data: { postId: posts[1].id, authorId: madam.id } });
  await db.communityLike.create({ data: { postId: posts[1].id, authorId: staff[1].id } });
  await db.communityLike.create({ data: { postId: posts[3].id, authorId: staff[0].id } });

  // Training logs — trainee skill progression, mentored by the trainer
  if (trainer && trainees.length > 0) {
    const LOGS = [
      { traineeId: trainees[0].id, mentorId: trainer.id, skill: "Pattern drafting", title: "Drew a basic bodice block", note: "Grasped dart manipulation. Needs practice on armhole ease.", status: "Practicing", date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6) },
      { traineeId: trainees[0].id, mentorId: trainer.id, skill: "Flat-felled seams", title: "Practiced flat-felled seams on sample", note: "Clean finish on cotton. Will retry on silk next week.", status: "Proficient", date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3) },
      { traineeId: trainees[0].id, mentorId: madam.id, skill: "Bodice boning", title: "First boned bodice attempt", note: "Boning channels slightly uneven. Shadowing Akos on the next bridal commission.", status: "Learning", date: new Date(now.getTime() - 1000 * 60 * 60 * 24) },
      { traineeId: trainees[1].id, mentorId: trainer.id, skill: "Measurements", title: "Took first solo client measurements", note: "Bust, waist, hip recorded accurately. Needs to refine shoulder measurement.", status: "Practicing", date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2) },
      { traineeId: trainees[1].id, mentorId: trainer.id, skill: "Kente cutting", title: "Learned to cut kente on the grain", note: "Understands pattern matching. Ready for a small commission.", status: "Proficient", date: new Date(now.getTime() - 1000 * 60 * 60 * 12) },
    ];
    for (const l of LOGS) {
      await db.trainingLog.create({ data: { ...l, shopId } });
    }
  }

  // Trainee practice assignments — graded by the trainer (school-portal style)
  if (trainer && trainees.length > 0) {
    const ASSIGNMENTS = [
      // Ama's assignments
      { staffId: trainees[0].id, title: "Practice: flat-felled seam sample (cotton)", maxScore: 20, score: 18, feedback: "Clean finish. Keep the seam allowance even.", status: "Done", dueDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5) },
      { staffId: trainees[0].id, title: "Practice: dart manipulation on bodice block", maxScore: 20, score: 15, feedback: "Good grasp. Two darts slightly off-centre.", status: "Done", dueDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3) },
      { staffId: trainees[0].id, title: "Practice: hand-picked zipper", maxScore: 20, score: null, feedback: null, status: "In Progress", dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2) },
      { staffId: trainees[0].id, title: "Practice: bias binding finish", maxScore: 20, score: null, feedback: null, status: "To Do", dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7) },
      // Kojo's assignments
      { staffId: trainees[1].id, title: "Practice: kente pattern matching", maxScore: 20, score: 19, feedback: "Excellent pattern alignment.", status: "Done", dueDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4) },
      { staffId: trainees[1].id, title: "Practice: measuring a client (bust/waist/hip)", maxScore: 20, score: 17, feedback: "Accurate. Refine shoulder measurement.", status: "Done", dueDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2) },
      { staffId: trainees[1].id, title: "Practice: hemming a pair of trousers", maxScore: 20, score: null, feedback: null, status: "In Progress", dueDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3) },
    ];
    for (const a of ASSIGNMENTS) {
      const isGraded = a.score !== null;
      await db.task.create({
        data: {
          shopId,
          title: a.title,
          staffId: a.staffId,
          status: a.status,
          priority: "Medium",
          dueDate: a.dueDate,
          maxScore: a.maxScore,
          score: a.score,
          gradedById: isGraded ? trainer.id : null,
          gradedAt: isGraded ? new Date(a.dueDate.getTime() + 1000 * 60 * 60 * 24) : null,
          feedback: a.feedback,
        },
      });
    }
  }

  // Certificate — Kojo completed his apprenticeship (issued by the trainer)
  if (trainer && trainees.length > 1) {
    await db.certificate.create({
      data: {
        shopId,
        traineeId: trainees[1].id,
        issuedById: trainer.id,
        programName: "Atelier Apprenticeship Programme",
        durationWeeks: 12,
        skillsAchieved: "Measurements, Kente cutting, Flat-felled seams, Pattern drafting",
        honors: "Distinction",
        certificateNo: `MS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        issuedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      },
    });
  }

  console.log(`Seeded ${users.length} people (${staff.length} staff, ${trainees.length} trainees), ${customers.length} customers, ${orders.length} orders, ${FREELANCERS.length} freelancers, ${COMMUNITY.length} community posts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
