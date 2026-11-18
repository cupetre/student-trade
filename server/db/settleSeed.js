// First Settle In guides (Koper / University of Primorska, students from
// North Macedonia first). Loaded by scripts/seed-settle.js. After that, edit
// them in the app (/settle-in/admin): the seed never overwrites a guide that
// already exists unless you run it with --force.
//
// Every fact comes from the page in `sources`, checked on `last_checked`.
// Check again before each semester: fees and amounts change.

const UP_WELCOME = { title: 'University of Primorska: visas and permits', url: 'https://welcome.upr.si/student/prepare/visas-permit/visas-permit-3-2/' };
const INFOTUJCI = { title: 'infotujci.si: temporary residence permit for study', url: 'https://infotujci.si/en/vsebina/non-eu-citizens/temporary-residence-permit/based-on-studies/dovoljenje-za-zacasno-prebivanje-zaradi-studija/' };
const UL_PERMIT = { title: 'University of Ljubljana: temporary residence permit for studies', url: 'https://www.uni-lj.si/en/study/international-students/temporary-residence-permit/non-eu-citizens/temporary-residence-permit-for-studies' };
const ZZZS = { title: 'ZZZS: studying in Slovenia', url: 'https://zzzs.si/en/accessing-healthcare-in-slovenia/studying-in-slovenia' };
const GOV_RESIDENCE = { title: 'gov.si: registering your residence', url: 'https://www.gov.si/teme/prebivalisce/' };
const FURS_TAX = { title: 'FURS: tax number for foreigners', url: 'https://fu.gov.si/zivljenjski_dogodki_prebivalci/pridobitev_davcne_stevilke_za_tujca' };
const SERVIS = { title: 'Študentski servis: information for foreign students', url: 'https://www.studentski-servis.com/studenti/foreigners' };
const GOV_MEALS = { title: 'gov.si: subsidised student meals', url: 'https://www.gov.si/teme/subvencionirana-studentska-prehrana' };
const SP_SITE = { title: 'Študentska prehrana', url: 'https://www.studentska-prehrana.si/en' };

const CHECKED = '2026-11-18';

const guides = [
    {
        slug: 'proof-of-money',
        topic: 'money', phase: 'before', position: 10,
        applies_to: ['non_eu'],
        status: 'live', last_checked: CHECKED, sources: [UP_WELCOME, UL_PERMIT],
        content: {
            en: {
                title: 'Show you have enough money',
                summary: 'The residence permit asks you to prove €507.43 a month for your stay. Sort out which proof you’ll use before you apply.',
                bring: [
                    'Bank statements showing the money has been there for a while',
                    'Or a scholarship contract',
                    'Or an employment contract with six months of bank statements',
                    'Or a statement from your parents that they support you, with your birth certificate',
                ],
                steps: [
                    'Work out the total: €507.43 for every month the permit should cover.',
                    'Pick one kind of proof from the list and get it in your name (or your parents’).',
                    'If your parents support you, their statement must say they cover at least €507.43 a month for the whole academic year.',
                    'Add it to your permit documents.',
                ],
                cost: 'Nothing, apart from bank fees for statements.',
                time: 'Start a few weeks before you apply: banks can take a few days.',
                mistakes: [
                    'A large sum paid into the account just before applying: it isn’t always accepted.',
                    'A parents’ statement that doesn’t give the monthly amount.',
                ],
            },
            sl: {
                title: 'Dokažite, da imate dovolj sredstev',
                summary: 'Za dovoljenje za prebivanje morate dokazati 507,43 € na mesec. Pred oddajo vloge se odločite, kateri dokaz boste uporabili.',
            },
        },
    },
    {
        slug: 'residence-permit',
        topic: 'documents', phase: 'before', position: 20,
        city: 'Koper',
        applies_to: ['non_eu'],
        depends_on: ['proof-of-money'],
        asks_date: 'permit_date',
        status: 'live', last_checked: CHECKED, sources: [UP_WELCOME, INFOTUJCI, UL_PERMIT],
        content: {
            en: {
                title: 'Residence permit for study',
                summary: 'Non-EU students need a temporary residence permit to study in Slovenia. Apply at the Slovenian embassy at home, or at Upravna enota Koper once you’re here.',
                bring: [
                    'The application form and the signature form, signed',
                    'Passport valid at least 3 months after your planned stay, and a copy',
                    'One photo, 35 × 45 mm',
                    'Certificate of enrolment from your faculty (and a transcript if you’re in a higher year)',
                    'Criminal record certificate from your home country, not older than 3 months, translated into Slovene by a court interpreter',
                    'Proof of health insurance (at least emergency care)',
                    'Proof of money: €507.43 a month',
                    'The receipt for the fee',
                ],
                steps: [
                    'Decide where you apply: the Slovenian embassy in your country, or Upravna enota Koper after you arrive. You can apply in Slovenia if you don’t need a visa to enter.',
                    'Collect the documents on the list. North Macedonia, Serbia, Bosnia and Herzegovina and Russia don’t need to legalise the criminal record certificate; other countries need an apostille.',
                    'Have every document translated into Slovene by a court interpreter.',
                    'Hand everything in and give two fingerprints.',
                    'Leave your phone number (and a Slovene speaker’s): they call you when the card is ready.',
                    'Collect the card in person, then tick this step with the date you got it. Your address registration deadline counts from that day.',
                ],
                cost: '€69.97 in total: €50 fee, €4.50 application, €15.47 for the card. Students on Erasmus+ or an inter-university agreement get their first permit free but pay for the card. Translations are extra.',
                time: 'No fixed time; study permits are handled as a priority. The permit lasts up to one year and you extend it before it runs out.',
                where: {
                    name: 'Upravna enota Koper',
                    address: 'Piranska cesta 2, 6000 Koper',
                    hours: 'Mon, Tue 8–12 and 13–15 · Wed 8–12 and 13–18 · Fri 8–13',
                    map_url: 'https://www.openstreetmap.org/search?query=Piranska%20cesta%202%2C%20Koper',
                },
                mistakes: [
                    'A criminal record certificate older than 3 months on the day you apply.',
                    'Translations not made by a court interpreter.',
                    'A passport that runs out less than 3 months after your stay.',
                    'Going alone: staff may only speak Slovene, so bring a buddy.',
                ],
            },
            sl: {
                title: 'Dovoljenje za prebivanje zaradi študija',
                summary: 'Študenti iz držav zunaj EU potrebujejo dovoljenje za začasno prebivanje. Vlogo oddate na slovenskem veleposlaništvu doma ali na Upravni enoti Koper, ko prispete.',
            },
            mk: {
                title: 'Дозвола за престој за студирање',
                summary: 'Студентите од земји надвор од ЕУ имаат потреба од дозвола за привремен престој. Барањето го поднесуваш во словенечката амбасада во Скопје или во Управната единица Копер кога ќе пристигнеш.',
            },
        },
    },
    {
        slug: 'health-insurance-north-macedonia',
        topic: 'health', phase: 'before', position: 30,
        applies_to: ['country:MK'],
        status: 'live', last_checked: CHECKED, sources: [ZZZS, UP_WELCOME],
        content: {
            en: {
                title: 'Health insurance from North Macedonia',
                summary: 'If you’re insured at home, bring form RM/SI 3 from your health fund. In Slovenia you exchange it at ZZZS for a certificate that covers emergency care.',
                bring: [
                    'Form RM/SI 3 from the Health Insurance Fund of North Macedonia',
                    'Passport',
                ],
                steps: [
                    'Before you leave, ask your health fund at home for form RM/SI 3.',
                    'Use it as the health insurance proof for your residence permit.',
                    'In Slovenia, take it to a ZZZS regional unit. You get a certificate called “Potrdilo MedZZ”.',
                    'Keep it with you: it covers emergency care only.',
                    'Not insured at home? You can take out compulsory health insurance as a foreign student at ZZZS with form M-1, your ID and your enrolment certificate. It is paid monthly.',
                ],
                cost: 'The form is free. Compulsory insurance in Slovenia is paid monthly; ask ZZZS for the current amount.',
                mistakes: ['Expecting full health care with Potrdilo MedZZ: it is for emergencies.'],
            },
            sl: {
                title: 'Zdravstveno zavarovanje iz Severne Makedonije',
                summary: 'Če ste zavarovani doma, prinesite obrazec RM/SI 3. Na ZZZS ga zamenjate za potrdilo za nujno zdravljenje.',
            },
            mk: {
                title: 'Здравствено осигурување од Македонија',
                summary: 'Ако си осигуран дома, донеси го образецот RM/SI 3 од Фондот за здравство. Во Словенија го менуваш во ZZZS за потврда за итна здравствена заштита.',
            },
        },
    },
    {
        slug: 'find-a-room',
        topic: 'housing', phase: 'before', position: 40,
        applies_to: ['not_yet'],
        status: 'live', last_checked: CHECKED, sources: [UL_PERMIT, GOV_RESIDENCE],
        content: {
            en: {
                title: 'Find a room',
                summary: 'Find a place before you arrive, with a contract you can use to register your address.',
                steps: [
                    'Browse Housing on Sidro: every listing is checked by a person.',
                    'Look for the “Address registration” tag: you need to register where you live.',
                    'Non-EU students: the contract should cover the whole permit period, usually one year.',
                    'Message the landlord in the app and agree on a viewing (a video call works if you’re still at home).',
                    'Once you’ve agreed, change “Where you’ll live” in Settle In to “Private room”.',
                ],
                mistakes: [
                    'Paying a deposit before you’ve seen the place or the contract.',
                    'A place where the owner won’t let you register the address.',
                ],
            },
            sl: {
                title: 'Najdite sobo',
                summary: 'Najdite bivanje pred prihodom, s pogodbo, s katero lahko prijavite prebivališče.',
            },
        },
    },
    {
        slug: 'address-registration',
        topic: 'documents', phase: 'first_week', position: 10,
        applies_to: ['non_eu', 'private'],
        depends_on: ['residence-permit'],
        deadline_anchor: 'permit_date', deadline_days: 8,
        status: 'live', last_checked: CHECKED, sources: [GOV_RESIDENCE, UL_PERMIT],
        content: {
            en: {
                title: 'Register your address',
                summary: 'If you live in a private room, register your temporary address within 8 days of receiving your residence permit.',
                bring: [
                    'Your residence permit',
                    'Passport',
                    'Rental or sublease contract, or the landlord’s consent',
                ],
                steps: [
                    'Go to the upravna enota within 8 days of getting your permit card.',
                    'Show your permit, passport and contract (or the landlord’s consent).',
                    'Or do it online on e-uprava, if you have an electronic identity.',
                    'Living in a student dorm? The dorm registers you.',
                ],
                cost: 'Free.',
                time: 'Usually done on the spot.',
                mistakes: [
                    'Waiting longer than 8 days.',
                    'A contract that ends before your permit.',
                ],
            },
            sl: {
                title: 'Prijavite začasno prebivališče',
                summary: 'Če živite v zasebni sobi, prijavite začasno prebivališče v 8 dneh od prejema dovoljenja za prebivanje.',
            },
            mk: {
                title: 'Пријави ја адресата',
                summary: 'Ако живееш во приватна соба, пријави ја привремената адреса во рок од 8 дена откако ќе ја добиеш дозволата за престој.',
            },
        },
    },
    {
        slug: 'tax-number',
        topic: 'money', phase: 'first_month', position: 10,
        applies_to: ['foreign'],
        status: 'live', last_checked: CHECKED, sources: [FURS_TAX, SERVIS],
        content: {
            en: {
                title: 'Get a Slovenian tax number',
                summary: 'You need a Slovenian tax number for student work. Ask for it at any financial office with form DR-02.',
                bring: ['Form DR-02 (there’s an English version)', 'Passport or ID card'],
                steps: [
                    'Fill in form DR-02.',
                    'Hand it in at any financial office (finančni urad), or send it by post with a copy of your ID.',
                    'Your tax number arrives by post within 8 days of a complete application.',
                    'Tell the financial office within 8 days if your details change later.',
                ],
                time: 'Up to 8 days after a complete application.',
            },
            sl: {
                title: 'Pridobite slovensko davčno številko',
                summary: 'Za študentsko delo potrebujete slovensko davčno številko. Z obrazcem DR-02 jo dobite na katerem koli finančnem uradu.',
            },
        },
    },
    {
        slug: 'bank-account',
        topic: 'money', phase: 'first_month', position: 20,
        applies_to: ['foreign'],
        status: 'live', last_checked: CHECKED, sources: [SERVIS],
        content: {
            en: {
                title: 'Bank account for student work',
                summary: 'Student work is paid only into a bank account in your own name. A Slovenian bank works, and so does an EU bank such as N26 or Revolut.',
                steps: [
                    'Choose a Slovenian bank or an EU bank account in your own name.',
                    'Find your IBAN: that’s what the student service needs, not your card number.',
                    'Add it to your student service profile before your first job.',
                ],
                mistakes: [
                    'A parent’s or friend’s account: payments can’t go to someone else.',
                    'A prepaid or credit card instead of an account.',
                ],
            },
            sl: {
                title: 'Bančni račun za študentsko delo',
                summary: 'Študentsko delo se izplača le na račun na vaše ime. Velja slovenska banka ali banka iz EU, npr. N26 ali Revolut.',
            },
        },
    },
    {
        slug: 'student-work',
        topic: 'work', phase: 'first_month', position: 30,
        applies_to: ['foreign'],
        depends_on: ['tax-number', 'bank-account'],
        status: 'live', last_checked: CHECKED, sources: [SERVIS, INFOTUJCI],
        content: {
            en: {
                title: 'Start student work',
                summary: 'Students can work through a student employment service (študentski servis). Join online, then get a referral for every job.',
                bring: [
                    'Passport or ID',
                    'Bank account in your name (IBAN)',
                    'EMŠO, your Slovenian personal identification number',
                    'Slovenian tax number',
                    'Non-EU students: a valid residence permit',
                ],
                steps: [
                    'Join a student service online; you don’t need to visit an office.',
                    'Your student status is usually checked automatically if you’re enrolled in Slovenia this year.',
                    'Before you start any job, order a referral (napotnica) from the service: it’s the legal basis for the work.',
                    'Use their app to keep track of jobs and payments.',
                ],
            },
            sl: {
                title: 'Začnite s študentskim delom',
                summary: 'Študenti delajo prek študentskega servisa. Včlanite se na spletu, za vsako delo pa potrebujete napotnico.',
            },
        },
    },
    {
        slug: 'studentski-boni',
        topic: 'food', phase: 'first_month', position: 40,
        status: 'live', last_checked: CHECKED, sources: [GOV_MEALS, SP_SITE],
        content: {
            en: {
                title: 'Student meal vouchers (boni)',
                summary: 'Enrolled students get one subsidised meal a day. The subsidy is €5.19 per meal since 1 March 2026.',
                steps: [
                    'Check you qualify: enrolled at a Slovenian university or college, not employed, no pension. Exchange students qualify too.',
                    'The first time, visit a student meals point (SP point) in person. In Koper, ŠOUP can tell you where.',
                    'Install the official Študentska prehrana app.',
                    'Pick a restaurant from the list on studentska-prehrana.si and pay only the difference.',
                    'Next year your rights renew automatically while you’re enrolled.',
                ],
                cost: 'You pay the meal price minus the €5.19 subsidy. One subsidised meal a day, between 7:00 and 24:00.',
            },
            sl: {
                title: 'Študentski boni',
                summary: 'Vpisani študenti imajo en subvencioniran obrok na dan. Subvencija znaša 5,19 € na obrok od 1. marca 2026.',
            },
            mk: {
                title: 'Студентски бонови за храна',
                summary: 'Запишаните студенти добиваат еден субвенциониран оброк на ден. Субвенцијата е 5,19 € по оброк од 1 март 2026.',
            },
        },
    },
    // Drafts: not on anyone's checklist until you add a source and set them live
    {
        slug: 'sim-card',
        topic: 'phone', phase: 'first_week', position: 20,
        status: 'draft', last_checked: CHECKED, sources: [],
        content: {
            en: {
                title: 'Get a Slovenian SIM card',
                summary: 'Draft: add the operators’ student offers, what to bring to the shop, and a source for each.',
            },
            sl: { title: 'Kupite slovensko SIM kartico', summary: 'Osnutek.' },
        },
    },
    {
        slug: 'getting-around',
        topic: 'transport', phase: 'first_week', position: 30,
        status: 'draft', last_checked: CHECKED, sources: [],
        content: {
            en: {
                title: 'Buses and trains',
                summary: 'Draft: add the city bus, the student monthly pass and trains home, with sources.',
            },
            sl: { title: 'Avtobusi in vlaki', summary: 'Osnutek.' },
        },
    },
];

module.exports = { guides };
