# Housing listing fields: what to add

Everything a landlord can tell about a place, gathered from 110 rental ads on nepremicnine.net (flats, rooms, studios and houses in Koper, Ljubljana and Maribor, November 2026) and its advanced search, plus what students need that nepremicnine doesn't ask.

Use this file when we extend the listing form (`client/src/Pages/housing/HousingFormPage.jsx`), the listing page, the Browse filters and the server (`server/lib/housingOptions.js`, `server/lib/housingValidation.js`, `prisma/schema.prisma` → `HousingListing`).

**Legend**
- ✅ we already have it
- ➕ to add
- **(n/110)**: how many of the 110 nepremicnine ads used it, i.e. how much landlords care
- **SL**: the Slovenian word landlords know from nepremicnine, for our SL labels later
- **Filter**: worth offering as a filter on Housing → Browse

---

## 1. Type and size

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ✅ | Property type | vrsta | `property_type` (room_in_flat, room_in_house, shared_room, studio, apartment, house) | yes |
| ✅ | Size, m² | velikost | `area_m2` (110/110) | min size |
| ➕ | Plot size, m² (houses) | zemljišče | `land_m2 Int?` (33/110) | |
| ➕ | Layout as a room count | 1-sobno, 1,5-sobno … 5 in večsobno, garsonjera | `layout VarChar(10)`: studio, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5plus. Keep `total_rooms` or replace it (decide) | yes |
| ➕ | Bedrooms | št. spalnic | `bedrooms SmallInt?` (82/110) | |
| ✅ | Bathrooms | št. kopalnic | `bathrooms` (85/110) | |
| ➕ | Separate WC | ločen WC | amenity `separate_wc` (23/110) | |
| ➕ | Floor / total floors | nadstropje, e.g. "2/4", "P", "ME", "M" | `floor VarChar(5)` (basement, ground, mezzanine, 1–30, attic) + `floors_total SmallInt?` (91/110) | |
| ➕ | Year built | zgrajeno l. | `year_built SmallInt?` (in almost every title line) | |
| ➕ | Year renovated | adaptirano l. | `year_renovated SmallInt?` | |
| ➕ | Flat inside a house | stanovanje v hiši | amenity `in_house` (20/110) | |
| ➕ | Shared flat | souporaba stanovanja | already covered by property types `room_in_flat` / `shared_room` (6/110) | |
| ➕ | Energy class | energijski razred | `energy_class VarChar(4)`: A1, A2, B1, B2, C, D, E, F, G, not_required, not_possible (~60/110). Show the kWh/m²a range next to it | |

## 2. Rental terms

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ✅ | Monthly rent (per person) | cena €/mesec | `rent_per_person` | max price |
| ✅ | Deposit | varščina | `deposit` (59/110) | |
| ✅ | Utilities included | stroški vključeni v ceno | `utilities_included` + `utilities_estimate` (10/110). Extend, see section 10 | yes |
| ✅ | Available from / until | vseljivo | `available_from`, `available_until` | move-in date |
| ➕ | Available immediately | vseljivo takoj | show "Available now" when `available_from` ≤ today; no new field needed (46/110) | yes |
| ➕ | Long-term / short-term rental | dolgoročni / kratkoročni najem | `lease_terms String[]`: long, short (53 + 14/110). We have `min_stay_months`; keep both | yes |
| ➕ | Notarised contract | notarsko overjena pogodba | `notarised_contract Boolean` (12/110) | |
| ➕ | Maximum number of people | maksimalno število oseb | `max_people SmallInt?` (32/110). Close to `spots_total`; decide whether it's the same thing | |
| ➕ | Suitable for | primerno za | `suitable_for String[]`: one_person, couple, students, families, workers, elderly, wheelchair (40, 37, 22, 22, 12, 10/110; several titles also say "primerno tudi za študente") | wheelchair |
| ✅ | Smoking allowed | kajenje (ni) dovoljeno | `smoking_allowed` (32/110) | yes |
| ✅ | Pets allowed | hišni ljubljenčki dovoljeni | `pets_allowed` (10/110) | yes |
| ✅ | Address registration allowed | prijava stalnega/začasnega prebivališča | `address_registration_allowed` (students ask first) | yes |
| ✅ | Subsidy eligible | subvencija | `subsidy_eligible` | yes |

## 3. Furnishing and appliances

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ✅ | Furnished / partly / unfurnished | polno / delno opremljeno | `furnishing` (56 + 13/110) | yes |
| ✅ | Washing machine | pralni stroj | amenity `washing_machine` | yes |
| ✅ | Dishwasher | pomivalni stroj | amenity `dishwasher` | yes |
| ➕ | Dryer | sušilni stroj | amenity `dryer` | yes |
| ➕ | Fridge | hladilnik | amenity `fridge` | |
| ➕ | Oven / stove | pečica / štedilnik | amenity `oven` | |
| ➕ | Microwave | mikrovalovna pečica | amenity `microwave` | |
| ➕ | TV | TV | amenity `tv` | |

nepremicnine has no appliance fields (landlords write them in the description), so this is where we can be clearer than them.

## 4. Outdoor space

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ✅ | Balcony | balkon | amenity `balcony` (49/110) | yes |
| ➕ | Terrace | terasa | amenity `terrace` (40/110) | yes |
| ➕ | Patio | atrij | amenity `patio` (20/110) | |
| ✅ | Garden | vrt | amenity `garden` (22/110) | |
| ➕ | Loggia | loža | amenity `loggia` (5/110) | |
| ➕ | Pool | bazen | amenity `pool` (2/110) | |

For the Browse filter, "outdoor space" can be one checkbox meaning any of balcony, terrace, patio, loggia or garden.

## 5. Building and storage

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ✅ | Lift | dvigalo | amenity `elevator` (29/110) | yes |
| ➕ | Storage room | shramba | amenity `storage` (37/110) | |
| ✅ | Bike storage | kolesarnica | amenity `bike_storage` (26/110) | |

## 6. Parking

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ✅ | Parking space | parkirno mesto | amenity `parking` (64/110) | yes |
| ➕ | Own parking spaces, how many | lastniško parkirno mesto | `own_parking_spaces SmallInt?` (31/110) | |
| ➕ | Garage | garaža | amenity `garage` (24/110) | |
| ➕ | EV charger | polnilna postaja | amenity `ev_charger` (2/110) | |
| ➕ | EV charger can be fitted | možnost polnilne postaje | amenity `ev_charger_possible` (7/110) | |

## 7. Heating and climate

Multi-select: a place can have several heating sources. Replace the single `central_heating` amenity with a `heating String[]` field and move existing listings that have `central_heating` to `radiators`.

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ➕ | Radiators | ogrevanje z radiatorji | heating `radiators` (41/110) | |
| ➕ | Gas | ogrevanje na plin | heating `gas` (28/110) | |
| ➕ | Electric | ogrevanje na elektriko | heating `electric` (15/110) | |
| ➕ | Oil | ogrevanje na olje | heating `oil` (7/110) | |
| ➕ | Wood / coal | ogrevanje na drva/premog | heating `wood` (2/110) | |
| ➕ | Heating with the air conditioner | ogrevanje s klimo | heating `air_conditioner` (23/110) | |
| ➕ | District heating | toplovod | heating `district` (12/110) | |
| ➕ | Underfloor heating | talno gretje | heating `underfloor` (22/110) | yes |
| ➕ | Heat pump | toplotna črpalka | heating `heat_pump` (19/110) | |
| ✅ | Air conditioning | klimatska naprava | amenity `air_conditioning` (57/110) | yes |
| ➕ | Ventilation system | prezračevalni sistem | amenity `ventilation` (10/110) | |
| ➕ | Solar panels | sončna elektrarna | amenity `solar` (1/110) | |

## 8. Internet and security

| | Field | SL | Proposed | Filter |
|---|---|---|---|---|
| ✅ | Internet | internet | amenity `internet` | yes |
| ➕ | Fibre internet | optični internet | amenity `fibre` (38/110) | |
| ➕ | Intercom | domofon | amenity `intercom` (30/110) | |
| ➕ | Security door | protivlomna vrata | amenity `security_door` (24/110) | |
| ➕ | Alarm | alarm | amenity `alarm` (7/110) | |
| ➕ | Video surveillance | videonadzor | amenity `cctv` (3/110) | |

## 9. What's nearby

Simple yes/no tags on nepremicnine. Proposed: `nearby String[]`. Later, some of these can be worked out automatically from the map pin instead of asking the landlord.

| | Field | SL | Value | Filter |
|---|---|---|---|---|
| ➕ | Bus stop | bližina avtobusne postaje | `bus` (54/110) | yes |
| ➕ | Nature | bližina narave | `nature` (52/110) | |
| ➕ | Sports / recreation | bližina rekreacijskih površin | `recreation` (51/110) | |
| ➕ | School | bližina šole | `school` (47/110) | |
| ➕ | Kindergarten | bližina vrtca | `kindergarten` (45/110) | |
| ➕ | Motorway exit | bližina avtocestnega izvoza | `motorway` (44/110) | |
| ➕ | City centre | bližina centra | `centre` (38/110) | yes |
| ➕ | Restaurants | bližina restavracij | `restaurants` (38/110) | |
| ➕ | Shops | bližina trgovine | `shops` (not a nepremicnine tag, often in descriptions) | |
| ➕ | Distance to the coast, km | do obale | `coast_km Decimal?` (8/110, coastal towns only) | |
| ➕ | **Time to the nearest faculty** | | worked out from the map pin: walking / bus minutes to each faculty. See DESIGN.md → Maps, "next steps" | yes |
| ➕ | Bus line(s) | linija | `bus_lines VarChar(50)?` | |

## 10. Monthly costs, itemised (students' most common question)

nepremicnine only has "utilities included". We should say exactly what the costs cover.

| | Field | Proposed |
|---|---|---|
| ✅ | Utilities included / estimate | `utilities_included`, `utilities_estimate` |
| ➕ | What's included | `costs_included String[]`: electricity, water, heating, internet, waste, rtv (RTV fee), building (building costs / reserve fund), cleaning |
| ➕ | Costs paid on top, estimate per person / month | keep `utilities_estimate`; optionally split into `costs_breakdown Json?` ({ electricity: 30, heating: 40, … }) |
| ➕ | How costs are paid | `costs_billing VarChar(10)?`: fixed (flat monthly amount) or actual (by real bills) |

## 11. The room itself (rooms in a shared flat)

| | Field | Proposed | Filter |
|---|---|---|---|
| ➕ | Private or shared bathroom | `bathroom_type VarChar(10)?`: private, shared | yes |
| ➕ | Shared kitchen | amenity `shared_kitchen` | |
| ➕ | Room size, m² | `room_m2 SmallInt?` (separate from the whole flat's `area_m2`) | |
| ➕ | Desk and chair | amenity `desk` | |
| ➕ | Wardrobe | amenity `wardrobe` | |
| ➕ | Bed size | `bed VarChar(10)?`: single, double, none | |
| ➕ | Lock on the room door | amenity `room_lock` | |

## 12. Flatmates and house rules

| | Field | Proposed |
|---|---|---|
| ✅ | Spots total / open | `spots_total`, `spots_open` |
| ➕ | Current flatmates | `flatmates_now SmallInt?` |
| ➕ | Flatmate gender | `flatmate_gender VarChar(10)?`: any, female, male, mixed |
| ➕ | Guests allowed | `guests_allowed Boolean?` |
| ➕ | Quiet hours | `quiet_hours VarChar(30)?` (e.g. "22:00–7:00") |
| ➕ | Cleaning | `cleaning VarChar(10)?`: rota (flatmates take turns), cleaner, tenant (each their own) |
| ✅ | Smoking / pets | `smoking_allowed`, `pets_allowed` |
| ✅ | Languages the owner speaks | `languages` |

## 13. Who is offering it

| | Field | SL | Proposed |
|---|---|---|---|
| ✅ | Landlord / student (sublet, roommate) | | `listing_type` |
| ➕ | Private landlord or agency | zasebna ponudba / agencija | from the landlord account: `agency Boolean` + company name, shown on the listing |
| ➕ | Agency's own ad code | šifra oglasa | `external_ref VarChar(30)?` (agencies use it to match their systems) |

## 14. Location (done)

✅ Street, postal code, city, neighbourhood, map pin (exact for the owner, approximate for everyone else). nepremicnine shows region / administrative unit / municipality / settlement and an approximate point, like we do.

---

## How to build it (suggestion)

1. **Server.** Extend the lists in `server/lib/housingOptions.js`:
   - `AMENITIES` gets the new keys.
   - New lists: `HEATING`, `NEARBY`, `SUITABLE_FOR`, `LEASE_TERMS`, `COSTS_INCLUDED`, `ENERGY_CLASSES`, `LAYOUTS`, `FLOORS`.
   - New columns from the tables above.
   - Validation in `housingValidation.js`, plus tests.
   - Move `central_heating` → `heating: ['radiators']` for existing listings.
2. **Form.** Group the checkboxes the same way as the sections above (Furnishing & appliances · Outdoor · Building & parking · Heating & climate · Internet & security · Nearby · Costs · Room · Flatmates & rules). Only type, size, rent, address and dates stay required; everything else is optional.
3. **Listing page.** Show the groups as icon lists, the way nepremicnine's "Lastnosti nepremičnine" does, and empty groups hide. Costs get their own clear box ("€320 rent + about €60 costs; includes water, heating, internet").
4. **Browse filters.** Add, behind a "More filters" button:
   - max price, min size
   - furnished, washing machine, dryer, dishwasher
   - outdoor space, parking, air conditioning, underfloor heating
   - pets, smoking
   - private bathroom, bills included
   - address registration, subsidy
   - available now, short- / long-term
   - near bus / centre
5. **Later.** Work out "near bus stop / centre / faculty" from the map pin instead of asking.

Sources: [nepremicnine.net rentals](https://www.nepremicnine.net/oglasi-oddaja/), [example listing](https://www.nepremicnine.net/oglasi-oddaja/ankaran-srebrniceva-13-stanovanje_7456311/), [advanced search](https://www.nepremicnine.net/nepremicnine.html).
