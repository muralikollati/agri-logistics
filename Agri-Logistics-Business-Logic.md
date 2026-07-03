# Agri-Transportation & Market Logistics — Business Logic Reference

This is the rulebook, independent of code or tech stack — every decision rule,
state transition, and condition that governs the system, consolidated in one
place. Use this to settle "what should happen when X" questions during
implementation, and as the source of truth if the code and this document ever
disagree (fix the code, not the rule, unless you deliberately change the rule here first).

---

## 1. Roles

| Role | Who they are | Can initiate a request? |
|---|---|---|
| **Farmer** | Grows and sells produce | Yes — self-service, minimal detail |
| **Transport Owner** | Owns/manages trucks and drivers (formerly "Transport Head" — same role, one name) | Yes — on behalf of a Farmer |
| **Driver** | Physically collects and transports produce | No — only acts once assigned |
| **Sangam Supervisor** | Market-side union worker who coordinates unloading | No — only acts once a truck arrives |
| **Shop Owner** | Wholesale buyer at the market | No — only acts once notified of an incoming delivery |

**Rule:** every other role (Driver, Sangam, Shop Owner) is *reactive* — they only enter the flow once someone upstream (Farmer or Transport Owner) has acted. Only Farmer and Transport Owner can create a new shipment.

---

## 2. Shipment Lifecycle (State Machine)

```
requested → assigned → picked_up → unloading → delivered → closed
                                          ↘ expired (if stale > 24h at picked_up)
```

| Status | Set by | What it means |
|---|---|---|
| `requested` | Farmer or Transport Owner | Produce is coming; no box/shop detail exists yet |
| `assigned` | Transport Owner | A Driver has been chosen; nothing physical has happened yet |
| `picked_up` | Driver | Boxes physically loaded; box count + shop-wise allocation now exist; PIN generated |
| `unloading` | Sangam (via correct PIN) | Truck is at market, shop-wise data is now visible to Sangam |
| `delivered` | Sangam (implicit, once unload entries cover full box count) | All boxes have been routed to their destination shops |
| `closed` | Shop Owner (marks a sale `isFinal: true`) | Day's sale is settled; Farmer sees final price |
| `expired` | System (scheduled job) | Shipment sat at `picked_up` for over 24 hours without reaching market — treated as stale/abandoned, not delivered |

**Rule:** status only ever moves forward (or to `expired` as a terminal dead-end from `picked_up`). There is no "reopen" or "go back" transition defined — if something goes wrong, it's handled via a discrepancy ticket (Section 6), not by reversing status.

---

## 3. Request Initiation Logic

**Path A — Farmer-initiated:**
- Farmer signals "produce ready." No box count, no shop allocation.
- This is the lowest-friction path — designed for a Farmer who's comfortable using the app but doesn't want to deal with driver logistics.

**Path B — Transport-Owner-initiated (on behalf of Farmer):**
- Used when the Farmer can't use the app, or simply prefers not to.
- Transport Owner enters Farmer details directly.
- **Rule:** even in this path, no box count or shop allocation is entered yet — that detail is *always* captured later, only by the Driver, only at physical pickup (Section 4). Neither initiation path ever pre-specifies box/shop detail.

**Rule — no confirmation required at initiation:** regardless of path, raising a request does not require the Farmer to confirm or approve anything. This was a deliberate simplification — see Section 8 for the tradeoff this accepts.

---

## 4. Driver Assignment Logic

- **Only the Transport Owner assigns drivers** — selected from a dropdown or entered manually. No auto-assignment, no Driver self-selection.
- The instant a Driver is assigned, **both Farmer and Driver are notified** — this is a one-way, informational push. Neither party takes an action in response.
- **Rule:** a shipment can only have one Driver assigned at a time. Reassignment logic (e.g., if a Driver becomes unavailable after assignment) is not yet defined — flagged as an open gap (Section 9).

---

## 5. Pickup Entry & PIN Generation Logic

This is the **first point in the entire flow where box count and shop-wise allocation are captured** — nowhere upstream.

1. Driver physically arrives at the farm.
2. Farmer verbally tells the Driver: total boxes, and how many go to each shop.
3. Driver enters this into the app and submits.
4. **On submit, the system automatically generates a 6-digit PIN** tied to this shipment.

**Visibility rule at this moment (fan-out):**

| Recipient | Sees |
|---|---|
| Farmer | Full detail: total boxes + complete shop-wise list |
| Transport Owner | Full detail: total boxes + complete shop-wise list, **and the PIN** (standing backup) |
| Driver | Full detail (they entered it) + the PIN |
| Each Shop Owner | **Only their own allocation** — e.g., the KKR shop owner sees "2 boxes," never the full 20-box breakdown |
| Sangam | **Nothing.** Sangam has zero visibility into this shipment until Section 6's PIN rule is satisfied |

**Rule — why the PIN exists:** shop-wise distribution is commercially sensitive (reveals which shops get preferential allocation). The PIN is the gate that controls when Sangam is allowed to see it.

---

## 6. PIN Handoff & Verification Logic

- **Who holds the PIN:** Driver and Transport Owner both hold the same PIN from the moment it's generated (Section 5). This is a deliberate dual-holder design — if the Driver is unreachable at market, the Transport Owner can relay the PIN directly. No separate "override" mechanism is needed because the backup access already exists.
- **Handoff to Sangam is verbal, not digital:** once Driver and Sangam supervisor agree to unload, the PIN is spoken/communicated by phone — there's no in-app "reveal" button. The system only records the *verification attempt*, not the handoff itself.
- **Verification is server-side only:** Sangam enters the PIN into the app; the comparison happens on the backend. The correct PIN value is never exposed to Sangam's client, even after a successful match.

**Retry & lockout rule:**
| Condition | Result |
|---|---|
| Incorrect PIN entered | Attempt count +1; error shown with attempts remaining |
| 5th consecutive incorrect attempt | Entry locks for 15 minutes; Transport Owner is notified of the failed attempts |
| Correct PIN entered (before lockout) | Shipment unlocks for that Sangam session; `status` moves to `unloading` |

**Session & expiry rules:**
- Once unlocked, the shop-wise data **stays unlocked for that Sangam session** — no need to re-enter the PIN for the same shipment.
- Unlock is **bound to the specific Sangam supervisor's session**, tied to the truck's Vehicle Number — a correct PIN entered by someone not logged into that vehicle's session doesn't unlock anything.
- **PIN expires 24 hours after pickup** if it's never used (shipment auto-moves to `expired`) — produce is perishable, so a shipment idle that long is treated as abandoned, not delayed.

---

## 7. Unloading & Distribution Logic

- Once unlocked, Sangam sees the full shop-wise allocation and assigns individual workers (by Worker ID) to carry specific box counts to specific shops via push-cart.
- Each worker assignment is logged as a discrete entry (worker ID, shop, box count) — there's no single "unload complete" toggle; delivery status is inferred from whether logged entries sum to the shipment's total box count.

---

## 8. Discrepancy Logic

**Trigger:** a Shop Owner's actual received count is less than their expected count (from Section 5's notification).

**Rule:**
| Condition | Action |
|---|---|
| Actual ≥ Expected | No ticket — proceeds directly to sale logging (Section 9) |
| Actual < Expected | Auto-raises a discrepancy ticket, tagging Sangam supervisor and Driver |

**Resolution:**
- Sangam (or Transport Owner) must respond with a reason code: `damaged`, `short_loaded`, or `misrouted`.
- **Open gap:** no SLA/auto-escalation timer is currently defined for how long a ticket can stay unresolved before escalating further (flagged in Section 9).

**Known accepted risk (from Section 3):** since the Farmer never confirms the Driver's pickup entry, a Driver could misreport quantities with no check at time of entry — the discrepancy system only catches mismatches *after* the fact, at the Shop Owner's end, not proactively.

---

## 9. Sale Logging & Settlement Logic

**Rule — sales are logged incrementally, not as one binary event:**
- A Shop Owner can log a **partial sale** (e.g., "30 of 50 boxes sold today at ₹X, 20 pending") any number of times through the day.
- Each sale entry is a discrete record: box count sold, price per box, and an `isFinal` flag.

**Rule — Farmer notification only fires on `isFinal: true`:**
- Partial sales do not notify the Farmer (avoids notification spam through the day).
- The moment a Shop Owner marks a sale entry as final for the day, the **Farmer, Driver, and Transport Owner are all notified with the full sale price** — this is the "deal closed" event referenced elsewhere in the doc.
- Unsold stock at day's end should be tagged (`carried_forward` / `discarded` / `returned`) — this tagging exists conceptually but is not yet built into the scaffold's `sales` schema (open gap).

**Rule — Farmer sees full price transparency:** unlike shop-wise allocation (hidden from other shops) or the PIN (hidden from Sangam until unlock), the **final sale price has no visibility restriction toward the Farmer** — full transparency was an explicit design choice to build trust in a market historically opaque to farmers about actual sale prices.

---

## 10. Payment & Fee Logic

Three distinct payment flows, each with **independent timing** — this separation is deliberate so nobody assumes one fee is contingent on another:

| Fee | Owed to | Timing | Contingent on sale? |
|---|---|---|---|
| **Badiga (transport/freight)** | Transporter/Driver | On delivery | No — service already rendered regardless of sale outcome |
| **Coolie (unloading/labor)** | Sangam | On unload completion | No — same logic as Badiga |
| **Produce payment** | Farmer | On sale settlement | **Yes** — tied directly to `isFinal` sale price; marked "pending settlement" until then |

**Platform monetization rule (long-term, not per-transaction):**
- First 1–2 years: **free**, to build adoption.
- Post-adoption: small per-box service fee (₹1–₹5) charged to **Transporters, Sangam, and Shop Owners only** — never to Farmers. This is a business policy, not a per-shipment calculation, but worth keeping in mind if fee logic is ever added to the shipment/sale records.

---

## 11. Notification Logic — Master Summary

Every notification in the system is **one-way/informational** — no confirmation, acknowledgment, or dispute action is required from any recipient at any point, except the discrepancy flow (Section 8), which is the one place an active response (reason code) is required.

| Trigger event | Who gets notified | What they see |
|---|---|---|
| Request raised | — (no notification yet; nothing to act on) | — |
| Driver assigned | Farmer, Driver | Assignment confirmation only |
| Pickup submitted (PIN generated) | Farmer, Transport Owner | Full box + shop detail |
| Pickup submitted (PIN generated) | Each Shop Owner | Own box count only |
| PIN lockout (5 failed attempts) | Transport Owner | Lockout alert |
| Discrepancy raised | Sangam, Driver | Ticket detail, reason-code required |
| Sale marked final | Farmer, Driver, Transport Owner | Full sale price |

---

## 12. Open Business-Logic Gaps (Not Yet Decided)

These are known unresolved rules — decide these before they're needed in production, not after:

1. **Driver reassignment:** what happens if an assigned Driver becomes unavailable before pickup? No re-assignment rule is defined.
2. **Discrepancy SLA:** how long before an unresolved ticket auto-escalates, and to whom beyond Transport Owner?
3. **Unsold stock tagging:** the `carried_forward` / `discarded` / `returned` states are conceptually agreed but not formally specified as part of the sale state machine.
4. **Multi-shop price display to Farmer:** if boxes went to 5 shops at 5 different prices, is the Farmer shown an itemized breakdown or one aggregate figure?
5. **Simultaneous Driver + Transport Owner unreachability:** the dual-PIN-holder design solves single-point failure, but not the case where both are unreachable at once — no fallback exists below that.
6. **Repeat PIN lockouts:** if a shipment locks out multiple times, is there an escalation beyond "notify Transport Owner," e.g., a manual reset path?
