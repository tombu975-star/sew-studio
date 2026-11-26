begin;
alter table private.platform_handbook drop constraint if exists platform_handbook_section_check;
alter table private.platform_handbook add constraint platform_handbook_section_check check(section in ('about','sop','privacy'));
insert into private.platform_handbook(section,content) values ('sop',$policy$# Sewsiness Standard Operating Procedures
Version 1.0 — proposed for management approval
Document owner: Sewsiness System Administration. Applies across all studios. Review annually and after significant platform changes.

## Purpose and scope
Promote professional, secure, accountable fashion atelier management for owners, staff, trainers, trainees, freelancers and administrators. Apply least privilege, confidentiality, accurate records, quality craftsmanship and respect for intellectual property.

## SOP 001 — Account security
Register accurate information; use unique personal accounts and strong passwords. Never share credentials or sessions. Sign out on shared devices, use official recovery and report suspected compromise promptly. Do not create duplicate accounts to bypass restrictions.

## SOP 002 — Studio configuration
Owners configure studio identity, currency, customer and payment policies, labour rates, complexity, overhead, markup, inventory and team permissions before operation. Keep settings current.

## SOP 003 — Roles and access
Owners oversee operations and finance; staff perform authorised production; trainers supervise learning; trainees complete assigned activities; freelancers access only agreed assignments; administrators maintain platform governance. Grant minimum necessary access and revoke it when no longer required. Where multi-studio participation is supported, authorise each studio separately.

## SOP 004 — Customer records
Explain collection purposes, collect necessary information only, check duplicates, maintain accurate contacts and preferences, restrict access and obtain appropriate permission for promotional use.

## SOP 005 — Measurements and fittings
Explain measurements, record accurately with dates, confirm changes, document fit preferences, schedule fittings and protect photographs and body-related records. Never ridicule or discriminate. Production photography is not permission for advertising.

## SOP 006 — Quotations
Confirm garment specifications and fabric supplier. Record materials, wastage, labour, embellishments, other costs and overhead. Review True Cost, markup, discounts, validity and payment conditions. Preserve agreed quotations and communicate changes before additional charges.

## SOP 007 — Overhead and True Cost
Material method: monthly overhead divided by expected monthly direct material spend, excluding labour; multiply the order material cost by that rate.
Revenue method: monthly overhead divided by expected monthly sales revenue; multiply pre-overhead sales value (direct production costs multiplied by one plus markup) by that rate.
True Cost = materials + wastage + labour + other production costs + allocated overhead. Recommended selling price = True Cost multiplied by one plus markup. Pre-overhead sales value is not a separate charge. Distinguish markup from profit margin. Review missing bases and unrealistic rates. Preserve saved costing snapshots.

## SOP 008 — Order approval
Select customer, confirm design, measurements, delivery, materials, costs and price; communicate deposit conditions, obtain approval and assign staff. Document authorised exceptions before production.

## SOP 009 — Production
Track confirmation, preparation, cutting, construction, embellishment, fitting, inspection and delivery. Report delays and shortages. Never misrepresent completion.

## SOP 010 — Quality assurance
Inspect fit, stitching, fabric, design, fasteners, embellishments, finishing, cleanliness and packaging. Correct or communicate defects before delivery.

## SOP 011 — Payments
Record payments against correct transactions, verify funds independently, issue confirmation, monitor balances and reconcile refunds and adjustments. Screenshots alone are not proof of receipt. Never request PINs, banking passwords or one-time codes.

## SOP 012 — Cost reconciliation
Preserve estimates, record actual material, labour and other costs, review overhead and profitability, investigate variances and improve future quotations.

## SOP 013 — Inventory and assets
Register stock and equipment, record receipts, issues, returns, losses and adjustments. Conduct physical counts, investigate discrepancies and monitor reorder levels.

## SOP 014 — Procurement
Prepare approved requirements and budgets, assign purchasing, retain receipts, inspect received materials and reconcile expenditure and unused funds.

## SOP 015 — Staff and tasks
Define responsibilities, assign deadlines and resources, monitor progress, resolve delays and evaluate fairly. Protect personnel and customer information.

## SOP 016 — Training
Register appropriate programmes, define learning objectives, assign practical work, record assessments and feedback, verify completion before certification. Never fabricate qualifications.

## SOP 017 — Freelancers
Review skills, agree deliverables, compensation and deadlines, share minimum necessary information, inspect work and confirm payment. Protect confidential designs and measurements.

## SOP 018 — Ready-to-Wear
Publish accurate descriptions, authorised photographs, prices, sizes and stock. Confirm orders and verified payments, inspect goods, record delivery and handle returns under communicated policies. Prohibit counterfeit goods and misleading promotions.

## SOP 019 — Delivery
Confirm completion and balance, apply agreed collection conditions, package properly, record dispatch or collection, confirm delivery and update status. Document feedback and unresolved concerns.

## SOP 020 — Community and intellectual property
Communicate respectfully, respect copyright and design ownership, obtain publication permission and report harassment, discrimination, impersonation and fraud.

## SOP 021 — Privacy
Collect lawfully, restrict access, share securely, avoid unnecessary copies, report disclosures and cooperate with privacy requests. Never access another studio without authorisation.

## SOP 022 — Security incidents
Stop affected activity where safe, protect credentials, report promptly, preserve evidence and cooperate with investigations. Administrators assess, contain, remediate and determine notification obligations.

## SOP 023 — Support
Provide affected module, error, approximate time and redacted screenshots. Never include passwords, payment codes or unnecessary customer data. Support documents, investigates and escalates issues.

## SOP 024 — Administration
Restrict administrative access, investigate misuse, maintain policies, monitor reliability, establish backups and recovery, test releases, document incidents and important administrative actions. No unnecessary access or personal advantage.

## SOP 025 — Continuous improvement
Review satisfaction, delivery, profitability, balances, inventory, efficiency, staff, training and privacy compliance. Administrators review and communicate approved changes.

## Governance
Only authorised platform administrators approve and publish official revisions. Studios may adopt supplementary procedures consistent with law and platform policies.$policy$),('privacy',$policy$# Sewsiness Privacy Policy
Version 1.0 — proposed for management approval; effective upon formal approval.

## 1. Introduction and scope
Sewsiness provides fashion atelier management, training, community and commerce services. This policy covers website visitors, studio users, freelancers, customers and support contacts. We aim to comply with Ghana's Data Protection Act, 2012 (Act 843).

## 2. Controller and processor
Sewsiness determines processing for its own accounts, administration, security and support. Independent studios generally determine processing of their customer and personnel records; Sewsiness may process those records on their behalf. Studios must establish lawful grounds and provide appropriate notices. The operator's registered legal identity, address and designated privacy contact must be confirmed before formal approval.

## 3. Information collected
Account identity, contact details, profile photos, roles and protected credentials; studio identity, permissions, business settings and financial records; customer contacts, preferences, orders, fittings and feedback; body measurements, proportions, design references and photographs; quotations, costs, deposits, payment references and refunds; training, assessments, certificates and freelancer qualifications; session identifiers, authentication events and diagnostic information where recorded.

## 4. Collection and purposes
Information comes from users, authorised studio personnel, transactions, support and necessary technical processes. We use it to provide accounts, studio operations, quotations, production, inventory, commerce, payments, learning, support, security, fraud prevention, reliability and legal compliance. Necessary information may be required for a service; optional information may be withheld.

## 5. Lawful processing
Processing may rely on consent, contract, legal obligations, legitimate interests where permitted or other lawful grounds. Consent may be withdrawn subject to lawful limitations. Do not submit another person's information without authority and a lawful basis.

## 6. Studio confidentiality
Access is designed to be restricted by studio and role. Administrators may access information only for legitimate support, maintenance, security or legal purposes. Customer records are not for unrelated marketing.

## 7. Sharing and providers
Information may be shared as necessary with authorised studio personnel, hosting and database providers (including Railway), payment providers such as Paystack where enabled, Selar for applicable digital products, email and messaging providers, delivery providers, advisers and authorities where required. Third-party services have their own policies. Do not submit payment PINs, card security codes or banking passwords through ordinary forms or support. Sewsiness shall not sell personal information to advertisers.

## 8. International processing
Cloud infrastructure and providers may process data outside Ghana. Appropriate safeguards and applicable transfer requirements must be established; actual locations and provider arrangements require confirmation.

## 9. Security
The platform uses password hashing, protected session management and role-based access controls. We work to maintain reasonable safeguards; no online service guarantees absolute security. Protect credentials and report suspected misuse.

## 10. Cookies
Authentication cookies maintain signed-in sessions and support security. Necessary functionality may use similar technologies. Optional analytics or advertising technologies, if introduced, require appropriate disclosure and consent where applicable. Disabling necessary cookies may prevent sign-in.

## 11. Retention and closure
Retain information only as necessary for service, contractual, accounting, legal, security, dispute and recovery purposes. Delete or anonymise information when no longer required. Protected backups may retain copies temporarily. Specific retention schedules and backup practices require confirmation. Account closure and deletion requests are subject to lawful retention and studio-controller responsibilities.

## 12. Individual rights
Subject to law, request information, access, correction, deletion or restriction where applicable, object to processing or marketing, withdraw consent, challenge qualifying solely automated decisions and complain to the regulator. Identity and authority may need verification. Requests must be handled within applicable statutory time limits.

## 13. Children and young trainees
Training and customer services may involve minors. Obtain parent or guardian authorisation where required; limit collection and disclosure of children's contact details, measurements, photographs and training records. Do not use them for unrelated promotion without appropriate authorisation.

## 14. Photographs and content
Obtain rights and permissions for uploaded content. Production photographs do not imply advertising consent. Public listings and community posts may be visible to others; avoid publishing private customer information. Measurements are not automatically biometric identification data; apply additional safeguards where special personal data is involved.

## 15. Communications
Service communications support account operation, security and transactions. Promotional communications require applicable lawful grounds, including prior written consent where required. Users may withdraw marketing consent.

## 16. Automated calculations
Quotations, overhead rates and profitability indicators assist business decisions. Owners review assumptions and determine final prices. Applicable safeguards for significant automated decisions must be respected.

## 17. Breaches
Assess, contain, investigate and remediate suspected breaches; notify authorities and affected individuals where legally required. Studio users must report suspected incidents promptly.

## 18. Changes and contact
Publish revised policies on the official website and communicate material changes appropriately. Submit privacy requests through the official contact channels at https://sewsiness.com. Complaints may also be directed to Ghana's Data Protection Commission at https://dpc.gov.gh.$policy$) on conflict(section) do nothing;
commit;
