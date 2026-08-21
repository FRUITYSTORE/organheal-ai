# OrganHeal AI — WhatsApp Template Specification V1

## Purpose

This document defines the approved internal contract that OrganHeal AI will use when creating WhatsApp Business message templates.

These template names are currently application-level contracts only.

They are NOT considered approved Meta WhatsApp templates until they are created and approved inside the Meta WhatsApp Business platform.

The purpose of this specification is to keep the Meta templates aligned exactly with:

- Follow-up decision logic
- Follow-up message generation
- Communication consent
- WhatsApp delivery
- English and Arabic behavior
- Patient-safety requirements

---

# 1. Core Rules

OrganHeal WhatsApp follow-up messages must:

1. Use approved WhatsApp templates for proactive outbound communication.
2. Never bypass user communication consent.
3. Never send to an unverified WhatsApp destination.
4. Preserve the existing Follow-up priority and purpose.
5. Preserve clinical safety wording for professional-review and urgent-review messages.
6. Never represent OrganHeal as providing a confirmed diagnosis.
7. Never change the clinical meaning of the message merely to fit a communication channel.
8. Keep the in-app Dashboard notification separate from external WhatsApp delivery.
9. Use the language already selected by the Follow-up Message layer.
10. Keep all external delivery controlled by the server-side background-job pipeline.

---

# 2. Current WhatsApp Template Contract

The application currently defines seven WhatsApp template families:

| Follow-up Purpose | Internal Template Name |
| --- | --- |
| routine-continuity | `organheal_routine_continuity` |
| complete-health-data | `organheal_complete_health_data` |
| complete-report-analysis | `organheal_complete_report_analysis` |
| repeat-checkin | `organheal_repeat_checkin` |
| review-health-plan | `organheal_review_health_plan` |
| professional-review | `organheal_professional_review` |
| urgent-review | `organheal_urgent_review` |

Each template should be created in both English and Arabic where supported by the Meta template configuration.

---

# 3. Parameter Contract

The current OrganHeal WhatsApp template builder sends parameters in this order:

## Standard template

Parameter 1:

`{{1}} = Follow-up title`

Parameter 2:

`{{2}} = Follow-up body`

Parameter 3:

`{{3}} = Action label`

Parameter 3 is omitted when no action label is available.

---

## Safety template

When a safety note is available:

Parameter 1:

`{{1}} = Follow-up title`

Parameter 2:

`{{2}} = Follow-up body`

Parameter 3:

`{{3}} = Action label`

Parameter 4:

`{{4}} = Safety note`

The Meta template created for that use case must use exactly the same parameter order.

---

# 4. Template — Routine Continuity

## Internal name

`organheal_routine_continuity`

## Purpose

Routine health continuity and ongoing monitoring.

## Expected parameters

- `{{1}}` Follow-up title
- `{{2}}` Follow-up body
- `{{3}}` Action label

## English example

Title parameter:

`Continue your current health routine`

Body parameter:

`Your current information supports routine follow-up. Continue your health plan and update your information when something changes.`

Action parameter:

`Open Health Plan`

## Arabic example

Title parameter:

`استمر في روتينك الصحي الحالي`

Body parameter:

`تدعم معلوماتك الحالية المتابعة الاعتيادية. استمر في خطتك الصحية وحدّث معلوماتك عند حدوث أي تغيير.`

Action parameter:

`افتح الخطة الصحية`

---

# 5. Template — Complete Health Data

## Internal name

`organheal_complete_health_data`

## Purpose

Encourage the user to provide missing health information.

This purpose may originate from actions such as:

- Complete assessment
- Upload medical report

## Expected parameters

- `{{1}}` Follow-up title
- `{{2}}` Follow-up body
- `{{3}}` Action label

## English examples

Possible title:

`Complete your health baseline`

Possible body:

`Complete your health assessment so OrganHeal can build a more connected and reliable picture of your health.`

Possible action:

`Start Assessment`

Alternative title:

`Add medical evidence`

Alternative body:

`Upload a medical report to strengthen the evidence available for your health analysis and follow-up plan.`

Alternative action:

`Upload Report`

## Arabic examples

Possible title:

`أكمل خط الأساس الصحي`

Possible body:

`أكمل تقييمك الصحي حتى يتمكن OrganHeal من بناء صورة صحية أكثر ترابطًا وموثوقية.`

Possible action:

`ابدأ التقييم`

Alternative title:

`أضف دليلًا طبيًا`

Alternative body:

`ارفع تقريرًا طبيًا لتعزيز الأدلة المتوفرة للتحليل الصحي وخطة المتابعة.`

Alternative action:

`ارفع تقريرًا`

---

# 6. Template — Complete Report Analysis

## Internal name

`organheal_complete_report_analysis`

## Purpose

Remind the user that an uploaded medical report still requires analysis.

## Expected parameters

- `{{1}}` Follow-up title
- `{{2}}` Follow-up body
- `{{3}}` Action label

## English example

Title:

`Complete your report analysis`

Body:

`Your uploaded report still needs analysis before its findings can fully support your health intelligence and next actions.`

Action:

`Analyze Report`

## Arabic example

Title:

`أكمل تحليل تقريرك`

Body:

`ما زال تقريرك المرفوع يحتاج إلى التحليل قبل أن تدعم نتائجه الذكاء الصحي والخطوات التالية بشكل كامل.`

Action:

`حلّل التقرير`

---

# 7. Template — Repeat Check-In

## Internal name

`organheal_repeat_checkin`

## Purpose

Encourage a new health check-in so OrganHeal can compare recent wellness signals.

## Expected parameters

- `{{1}}` Follow-up title
- `{{2}}` Follow-up body
- `{{3}}` Action label

## English example

Title:

`Add a new health check-in`

Body:

`Complete a new check-in so OrganHeal can compare your recent wellness signals and identify meaningful changes.`

Action:

`Open Check-In`

## Arabic example

Title:

`أضف تحديثًا صحيًا جديدًا`

Body:

`أكمل تحديثًا صحيًا جديدًا حتى يتمكن OrganHeal من مقارنة إشارات العافية الحديثة وتحديد التغيرات المهمة.`

Action:

`افتح التحديث الصحي`

---

# 8. Template — Review Health Plan

## Internal name

`organheal_review_health_plan`

## Purpose

Bring the user back to the current personalized health plan.

## Expected parameters

- `{{1}}` Follow-up title
- `{{2}}` Follow-up body
- `{{3}}` Action label

## English example

Title:

`Review your health plan`

Body:

`Review your current actions and follow-up steps to keep your health plan aligned with your latest information.`

Action:

`Open Health Plan`

## Arabic example

Title:

`راجع خطتك الصحية`

Body:

`راجع إجراءاتك الحالية وخطوات المتابعة للحفاظ على توافق خطتك الصحية مع أحدث معلوماتك.`

Action:

`افتح الخطة الصحية`

---

# 9. Template — Professional Review

## Internal name

`organheal_professional_review`

## Purpose

Recommend review by an appropriate healthcare professional without claiming a diagnosis.

## Expected parameters

- `{{1}}` Follow-up title
- `{{2}}` Follow-up body
- `{{3}}` Action label
- `{{4}}` Safety note

## English example

Title:

`Clinical review is recommended`

Body:

`The available information should be reviewed by an appropriate healthcare professional before stronger conclusions or changes are made.`

Action:

`Prepare Doctor Brief`

Safety note:

`This message is not a diagnosis or a substitute for clinical assessment. Review the information with an appropriate healthcare professional.`

## Arabic example

Title:

`يوصى بمراجعة سريرية`

Body:

`ينبغي أن يراجع مختص صحي مناسب المعلومات المتوفرة قبل الوصول إلى استنتاجات أقوى أو إجراء تغييرات.`

Action:

`حضّر موجز الطبيب`

Safety note:

`لا تمثل هذه الرسالة تشخيصًا أو بديلًا عن التقييم السريري. راجع مختصًا صحيًا مناسبًا.`

---

# 10. Template — Urgent Review

## Internal name

`organheal_urgent_review`

## Purpose

Communicate urgent review guidance while preserving strict clinical safety boundaries.

This template must not imply that OrganHeal has confirmed a diagnosis.

## Expected parameters

- `{{1}}` Follow-up title
- `{{2}}` Follow-up body
- `{{3}}` Action label
- `{{4}}` Safety note

## English safety example

Safety note:

`This message does not confirm a diagnosis. Seek urgent medical care immediately if you have severe or worsening symptoms.`

## Arabic safety example

Safety note:

`هذه الرسالة لا تؤكد تشخيصًا. إذا كانت لديك أعراض شديدة أو متفاقمة، فاطلب الرعاية الطبية العاجلة فورًا.`

## Important

The `urgent-review` template must never remove or weaken the safety note generated by the Follow-up Message service.

---

# 11. Internal Navigation

The current Follow-up Message layer may generate application paths such as:

- `/assessment`
- `/lab-upload`
- `/reports`
- `/intelligence`
- `/checkin`
- `/doctor-portal`
- `/health-plan`
- `/dashboard`

These paths must NOT be sent directly as WhatsApp URLs.

A future external-link resolver should convert an internal path into a full trusted OrganHeal URL, for example:

`https://organheal.com/checkin`

before a WhatsApp button or external link is generated.

This link resolution should remain separate from the WhatsApp template text contract.

---

# 12. Delivery Authorization

WhatsApp delivery must remain blocked unless all of the following are true:

- `whatsapp_enabled = true`
- A valid E.164 WhatsApp phone number exists
- The phone number has been verified
- WhatsApp consent has been granted
- Consent has not subsequently been revoked
- Communication preferences are available
- The background job is valid
- The selected channel is `whatsapp`
- The WhatsApp delivery feature flag is explicitly enabled

Production delivery feature flag:

`WHATSAPP_DELIVERY_ENABLED=true`

The feature flag must remain disabled until Meta configuration and approved templates are ready.

---

# 13. Required Server Configuration

The WhatsApp provider currently expects:

`WHATSAPP_ACCESS_TOKEN`

`WHATSAPP_PHONE_NUMBER_ID`

Optional:

`WHATSAPP_GRAPH_API_VERSION`

Production activation additionally requires:

`WHATSAPP_DELIVERY_ENABLED=true`

Secrets must remain server-side only.

They must never be exposed through `NEXT_PUBLIC_*` environment variables.

---

# 14. Delivery Status Semantics

The following concepts must remain separate:

## Dashboard Notification

An internal OrganHeal notification.

This does not mean that an external channel was contacted.

## External Delivery Intent

The Follow-up pipeline may select:

- Email
- WhatsApp
- Push

This represents the intended external channel.

## Provider Accepted

A provider such as WhatsApp Cloud API may accept the outbound message and return a provider message ID.

This means the request was accepted by the provider.

It does not necessarily prove that the message was delivered to or read by the user.

## Delivered / Read

Future webhook processing should update external delivery status using provider callbacks.

Do not infer delivered/read state from the initial send API response alone.

---

# 15. Future Delivery Audit Model

Before production-scale WhatsApp delivery, OrganHeal should eventually maintain external delivery records containing data such as:

- Background job ID
- User ID
- Channel
- Provider
- Provider message ID
- Template name
- Attempt number
- Requested timestamp
- Provider accepted timestamp
- Delivered timestamp
- Read timestamp
- Failed timestamp
- Provider error code
- Provider error category
- Idempotency key

This should remain separate from the existing internal Notification record.

---

# 16. Current V1 Status

Implemented:

- Follow-up decisions
- Follow-up message generation
- Follow-up dispatch planning
- Durable background jobs
- Retry policies
- Idempotency protection
- Communication preferences
- User consent gating
- WhatsApp phone storage
- WhatsApp phone verification state
- Dashboard/external-channel separation
- WhatsApp template mapping
- WhatsApp Cloud provider
- WhatsApp provider unit tests
- WhatsApp template mapping tests
- Feature flag protection
- Provider failure propagation into job retry flow

Not yet production-enabled:

- Meta Business configuration
- Approved Meta message templates
- Permanent production access token
- Production Phone Number ID configuration
- WhatsApp delivery feature flag
- Meta webhook verification
- Delivery/read status ingestion
- Production end-to-end WhatsApp test
- User-facing communication preferences UI
- User phone verification workflow

---

# 17. Production Activation Gate

Do NOT enable production WhatsApp sending until all of the following have been completed:

1. Meta WhatsApp Business account is configured.
2. Production phone number is registered.
3. The required templates are created.
4. English and Arabic template variants are approved.
5. Placeholder ordering matches this specification.
6. WhatsApp access credentials are configured securely.
7. Phone Number ID is configured.
8. A real opt-in workflow exists.
9. Phone verification workflow exists.
10. End-to-end delivery has been tested with a controlled test account.
11. Provider failures and retries are verified.
12. Delivery/read webhook handling is either implemented or explicitly accepted as a later production limitation.
13. `WHATSAPP_DELIVERY_ENABLED` is deliberately enabled only after all preceding checks pass.

---

## Architectural Principle

OrganHeal's clinical reasoning decides what follow-up is appropriate.

The communication layer decides whether the user has authorized the channel.

The template layer converts an approved follow-up into a channel-safe message contract.

The provider layer performs the external delivery.

No external communication provider should be allowed to alter OrganHeal's clinical priority, safety escalation, or clinical interpretation.