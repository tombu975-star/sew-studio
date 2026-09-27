// Thin snake_case (Postgres) → camelCase (frontend/lib/types.ts) mappers.
// Each route still calls these explicitly (rather than a generic recursive
// key-mapper) so relation embeds — which come back keyed by whatever alias
// the .select() used — stay easy to reason about at each call site.

export function serializeCustomer(c: Record<string, any>) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    whatsapp: c.whatsapp,
    gender: c.gender,
    occupation: c.occupation,
    city: c.city,
    country: c.country,
    entrySource: c.entry_source,
    referredBy: c.referred_by,
    customerType: c.customer_type,
    preferredStyles: c.preferred_styles,
    favouriteColours: c.favourite_colours,
    coloursToAvoid: c.colours_to_avoid,
    favouriteFabrics: c.favourite_fabrics,
    preferredFit: c.preferred_fit,
    designPreferences: c.design_preferences,
    styleNotes: c.style_notes,
    skinTone: c.skin_tone,
    height: c.height,
    weight: c.weight,
    loyaltyPoints: c.loyalty_points,
    notes: c.notes,
    status: c.status,
    createdAt: c.created_at,
    ...(c._orderCount !== undefined ? { _orderCount: c._orderCount } : {}),
  };
}

export function serializeUser(u: Record<string, any>) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    gender: u.gender,
    phone: u.phone,
    shopId: u.shop_id,
    mentorId: u.mentor_id,
    trainingDurationWeeks: u.training_duration_weeks,
    trainingStartedAt: u.training_started_at,
    programId: u.program_id,
    canAccessOrders: u.can_access_orders,
    canAccessBoard: u.can_access_board,
    canManageFreelancers: u.can_manage_freelancers,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

export function serializePayment(p: Record<string, any>) {
  return {
    id: p.id,
    orderId: p.order_id,
    amount: p.amount,
    method: p.method,
    date: p.date,
    note: p.note,
    createdAt: p.created_at,
  };
}

export function serializeFitting(f: Record<string, any>) {
  return {
    id: f.id,
    orderId: f.order_id,
    date: f.date,
    status: f.status,
    notes: f.notes,
    createdAt: f.created_at,
  };
}

export function serializeOrder(o: Record<string, any>) {
  return {
    id: o.id,
    customerId: o.customer_id,
    customer: o.customer ? serializeCustomer(o.customer) : undefined,
    garmentDesign: o.garment_design,
    designImage: o.design_image,
    orderDate: o.order_date,
    deliveryDate: o.delivery_date,
    status: o.status,
    assignedStaffId: o.assigned_staff_id,
    assignedStaff: o.assigned_staff ? serializeUser(o.assigned_staff) : undefined,
    sellingPrice: o.selling_price,
    fabricCost: o.fabric_cost,
    labourCost: o.labour_cost,
    notes: o.notes,
    priority: o.priority,
    payments: Array.isArray(o.payments) ? o.payments.map(serializePayment) : undefined,
    fittings: Array.isArray(o.fittings) ? o.fittings.map(serializeFitting) : undefined,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

export function serializeTask(t: Record<string, any>) {
  return {
    id: t.id,
    title: t.title,
    orderId: t.order_id,
    order: t.order ? serializeOrder(t.order) : undefined,
    staffId: t.staff_id,
    staff: t.staff ? serializeUser(t.staff) : undefined,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    notes: t.notes,
    maxScore: t.max_score,
    score: t.score,
    gradedById: t.graded_by_id,
    gradedBy: t.graded_by ? serializeUser(t.graded_by) : undefined,
    gradedAt: t.graded_at,
    feedback: t.feedback,
    moduleId: t.competency_unit_id,
    module: t.module
      ? {
          id: t.module.id,
          title: t.module.title,
          competencyCode: t.module.code,
          curriculumId: t.module.program_id,
        }
      : undefined,
    createdAt: t.created_at,
  };
}

export function serializeMeasurementSet(m: Record<string, any>) {
  return {
    id: m.id,
    customerId: m.customer_id,
    staffId: m.staff_id,
    unit: m.unit,
    dateTaken: m.date_taken,
    bust: m.bust,
    waist: m.waist,
    hip: m.hip,
    shoulder: m.shoulder,
    length: m.length,
    sleeve: m.sleeve,
    inseam: m.inseam,
    neck: m.neck,
    notes: m.notes,
  };
}

export function serializeCustomerFeedback(f: Record<string, any>) {
  return {
    id: f.id,
    customerId: f.customer_id,
    rating: f.rating,
    type: f.type,
    feedback: f.feedback,
    date: f.date,
  };
}

export function serializeStyleConcept(s: Record<string, any>) {
  return {
    id: s.id,
    customerId: s.customer_id,
    customer: s.customer ? serializeCustomer(s.customer) : undefined,
    garmentType: s.garment_type,
    occasion: s.occasion,
    desiredLook: s.desired_look,
    season: s.season,
    budget: s.budget,
    colourPreference: s.colour_preference,
    conceptName: s.concept_name,
    silhouette: s.silhouette,
    neckline: s.neckline,
    sleeveStyle: s.sleeve_style,
    length: s.length,
    fabric: s.fabric,
    colour: s.colour,
    detailing: s.detailing,
    embellishment: s.embellishment,
    whyThisMayWork: s.why_this_may_work,
    fitConsiderations: s.fit_considerations,
    matchPercent: s.match_percent,
    designDirection: s.design_direction,
    imageUrl: s.image_url,
    status: s.status,
    rejectionReason: s.rejection_reason,
    dataConfidence: s.data_confidence,
    createdAt: s.created_at,
  };
}

export function serializeCommunityComment(c: Record<string, any>) {
  return {
    id: c.id,
    postId: c.post_id,
    authorName: c.author_name,
    authorId: c.author_id,
    body: c.body,
    createdAt: c.created_at,
  };
}

export function serializeCommunityPost(p: Record<string, any>) {
  return {
    id: p.id,
    authorId: p.author_id,
    authorName: p.author_name,
    authorRole: p.author_role,
    type: p.type,
    title: p.title,
    body: p.body,
    imageUrl: p.image_url,
    pinned: p.pinned,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    comments: Array.isArray(p.comments) ? p.comments.map(serializeCommunityComment) : [],
    _count: {
      likes: Array.isArray(p.likes) ? (p.likes[0]?.count ?? 0) : 0,
    },
  };
}

export function serializeTrainingLog(l: Record<string, any>) {
  return {
    id: l.id,
    traineeId: l.trainee_id,
    trainee: l.trainee
      ? { id: l.trainee.id, fullName: l.trainee.full_name, role: l.trainee.role }
      : undefined,
    mentorId: l.mentor_id,
    mentor: l.mentor ? { id: l.mentor.id, fullName: l.mentor.full_name } : undefined,
    skill: l.skill,
    title: l.title,
    note: l.note,
    status: l.status,
    date: l.date,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}

export function serializeCompetencyUnit(u: Record<string, any>) {
  return {
    id: u.id,
    programId: u.program_id,
    code: u.code,
    title: u.title,
    learningOutcomes: u.learning_outcomes,
    assessmentCriteria: u.assessment_criteria,
    nominalHours: u.nominal_hours,
    order: u.order_index,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

export function serializeTrainingProgram(p: Record<string, any>) {
  return {
    id: p.id,
    name: p.name,
    level: p.level,
    durationWeeks: p.duration_weeks,
    description: p.description,
    createdById: p.created_by_id,
    createdBy: p.created_by ? { id: p.created_by.id, fullName: p.created_by.full_name } : undefined,
    units: Array.isArray(p.units)
      ? [...p.units].sort((a, b) => a.order_index - b.order_index).map(serializeCompetencyUnit)
      : undefined,
    _count: { trainees: Array.isArray(p.trainees) ? (p.trainees[0]?.count ?? 0) : (p._traineeCount ?? 0) },
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function serializeCertificate(c: Record<string, any>) {
  return {
    id: c.id,
    traineeId: c.trainee_id,
    trainee: c.trainee
      ? { id: c.trainee.id, fullName: c.trainee.full_name, email: c.trainee.email, gender: c.trainee.gender }
      : undefined,
    issuedById: c.issued_by_id,
    issuedBy: c.issued_by ? { id: c.issued_by.id, fullName: c.issued_by.full_name } : undefined,
    programName: c.program_name,
    durationWeeks: c.duration_weeks,
    skillsAchieved: c.skills_achieved,
    honors: c.honors,
    certificateNo: c.certificate_no,
    issuedAt: c.issued_at,
    createdAt: c.created_at,
  };
}

export function serializeFreelanceJob(j: Record<string, any>) {
  return {
    id: j.id,
    shopId: j.shop_id,
    freelancerId: j.freelancer_id,
    freelancer: j.freelancer ? { id: j.freelancer.id, fullName: j.freelancer.full_name } : undefined,
    orderId: j.order_id,
    taskDescription: j.task_description,
    cost: j.cost,
    dueDate: j.due_date,
    status: j.status,
    createdAt: j.created_at,
    updatedAt: j.updated_at,
  };
}

export function serializeSettings(s: Record<string, any>) {
  return {
    id: s.id,
    ownerGender: s.owner_gender,
    studioName: s.studio_name,
    overheadAmount: s.overhead_amount,
    selfPayout: s.self_payout,
    currency: s.currency,
    depositPercent: s.deposit_percent,
    rushFeePercent: s.rush_fee_percent,
    quoteValidDays: s.quote_valid_days,
    fullBalanceBeforePickup: s.full_balance_before_pickup,
    fittingsIncluded: s.fittings_included,
    alterationsWindowDays: s.alterations_window_days,
    depositPolicyText: s.deposit_policy_text,
    alterationsPolicyText: s.alterations_policy_text,
    cancellationPolicyText: s.cancellation_policy_text,
  };
}

/** The subset of settings that's safe and useful to show customers on the
 *  public portal — never the financial fields (overhead, payout, etc.). */
export function serializeShopPolicies(s: Record<string, any> | null | undefined) {
  if (!s) return null;
  return {
    depositPercent: s.deposit_percent,
    rushFeePercent: s.rush_fee_percent,
    quoteValidDays: s.quote_valid_days,
    fullBalanceBeforePickup: s.full_balance_before_pickup,
    fittingsIncluded: s.fittings_included,
    alterationsWindowDays: s.alterations_window_days,
    depositPolicyText: s.deposit_policy_text || "",
    alterationsPolicyText: s.alterations_policy_text || "",
    cancellationPolicyText: s.cancellation_policy_text || "",
  };
}
