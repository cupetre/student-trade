// Privacy policy and terms of use, in Slovenian and English.
//
// DRAFT written from what the code actually does (November 2026). Before launch:
//  - fill in everything in [square brackets] (who runs the service, contact, hosting),
//  - have a lawyer read both texts,
//  - have a native speaker read the Slovenian.
// When the app starts collecting something new, add it to "What we collect" here.
//
// Each section is { h: heading, p: [paragraphs], list: [bullets], after: [paragraphs] }.
import { BRAND_NAMES } from '../lib/brand';

const SL = BRAND_NAMES.sl;
const EN = BRAND_NAMES.en;
const UPDATED = '2026-11-17';
const OPERATOR = '[ime podjetja ali vaše ime, naslov, matična številka]';
const OPERATOR_EN = '[company or your name, address, registration number]';
const CONTACT = '[kontaktni e-naslov]';
const CONTACT_EN = '[contact email]';
const HOSTING = '[ponudnik gostovanja, npr. Hetzner Online GmbH, Nemčija]';
const HOSTING_EN = '[hosting provider, e.g. Hetzner Online GmbH, Germany]';

export const legalCopy = {
    sl: {
        updatedLabel: 'Zadnja sprememba',
        updated: UPDATED,
        otherPrivacy: 'Pravilnik o zasebnosti',
        otherTerms: 'Pogoji uporabe',
        privacy: {
            title: 'Pravilnik o zasebnosti',
            intro: `${SL} je spletno mesto za študente v Sloveniji: bivanje, tržnica in pomoč pri prvih korakih. Tukaj piše, katere podatke o vas hranimo, zakaj, kdo jih še vidi in kako jih izbrišete.`,
            sections: [
                { h: 'Kdo je upravljavec', p: [`Upravljavec osebnih podatkov je ${OPERATOR}. Za vsa vprašanja o vaših podatkih nam pišite na ${CONTACT}.`] },
                {
                    h: 'Kaj zbiramo',
                    list: [
                        'Račun: ime in priimek, e-naslov (pri študentih univerzitetni), geslo (shranjeno samo kot zgoščena vrednost, ki je ne moremo prebrati), vloga (študent ali najemodajalec), pri najemodajalcih tudi telefonska številka, ki je ne prikazujemo drugim.',
                        'Profil: profilna fotografija in opis, če ju dodate.',
                        'Najemniški profil (samo študenti): univerza, fakulteta, študij, datum rojstva (drugim prikazujemo samo starost), domača država in kraj, jeziki, kajenje, hišni ljubljenčki, način življenja, proračun, datum vselitve in želeno trajanje bivanja.',
                        'Kar objavite: oglase za bivanje in predmete na tržnici, njihove fotografije, opise in lokacijo. Točen žebljiček na zemljevidu vidite samo vi; drugi vidijo območje približno 200 m okoli točke, ki je zamaknjena.',
                        'Sporočila, ki jih pošiljate, in to, o katerem oglasu ali predmetu je pogovor.',
                        'Ocene, ki jih napišete in prejmete, prijave, všečkane oglase in predmete ter bivanja (kdo je bival v kateri nastanitvi).',
                        'Tehnične podatke: dnevnik zahtev na strežniku (kaj je bilo zahtevano, kdaj in kateri račun), ki ga potrebujemo za odpravljanje napak in varnost.',
                    ],
                    after: ['Ne uporabljamo oglaševalskih piškotkov ali orodij za sledenje. V brskalniku hranimo samo vašo prijavo, izbrani jezik in stran, na katero se vrnete po registraciji.'],
                },
                {
                    h: 'Zakaj in na kateri podlagi',
                    list: [
                        'Da lahko uporabljate storitev (račun, objave, sporočila, ocene): to je izvajanje pogodbe z vami (člen 6(1)(b) Splošne uredbe o varstvu podatkov).',
                        'Da je storitev varna (preverjanje študentskih e-naslovov in najemodajalcev, prijave, preprečevanje prevar in zlorab, dnevniki): naš zakoniti interes (člen 6(1)(f)).',
                        'E-sporočila pošiljamo samo za račun (potrditev, ponastavitev gesla). Oglaševalskih sporočil ne pošiljamo.',
                    ],
                },
                {
                    h: 'Kdo še vidi vaše podatke',
                    list: [
                        'Drugi uporabniki vidijo, kar je na vašem profilu in v vaših objavah. Najemodajalci, ki jim pišete, vidijo vaš najemniški profil. Ljudje, s katerimi se pogovarjate, vidijo vaša sporočila.',
                        'Obiskovalci brez računa vidijo samo okrnjene oglase: brez imen, opisov, ulic in točne lokacije.',
                        `Ponudniki, ki za nas obdelujejo podatke: ${HOSTING} (strežnik in podatkovna baza), Amazon Web Services (shranjevanje fotografij in pošiljanje e-sporočil) in OpenStreetMap (zemljevid; naslov, ki ga poiščete v obrazcu za oglas, se pošlje njihovi storitvi Nominatim).`,
                        'Podatkov ne prodajamo in jih ne dajemo oglaševalcem.',
                    ],
                },
                {
                    h: 'Kako dolgo jih hranimo',
                    p: [
                        'Dokler imate račun. Ko račun izbrišete (Moj profil → Račun → Izbriši račun), se takoj izbrišejo profil, oglasi, predmeti, sporočila, ocene, všečki, prijave in bivanja, iz shrambe pa tudi vse fotografije, ki ste jih naložili.',
                        'Varnostne kopije in dnevniki strežnika se samodejno izbrišejo v [30] dneh.',
                    ],
                },
                {
                    h: 'Vaše pravice',
                    p: [
                        `Pravico imate do vpogleda v svoje podatke, popravka, izbrisa, omejitve obdelave, prenosljivosti in ugovora. Večino lahko uredite sami v profilu; za ostalo nam pišite na ${CONTACT}. Odgovorimo v enem mesecu.`,
                        'Če menite, da z vašimi podatki ravnamo napačno, se lahko pritožite pri Informacijskem pooblaščencu (www.ip-rs.si).',
                    ],
                },
                { h: 'Starost', p: ['Za uporabo morate biti stari vsaj 16 let.'] },
                { h: 'Spremembe', p: ['Če ta pravilnik bistveno spremenimo, vas na to opozorimo v aplikaciji ali po e-pošti.'] },
            ],
        },
        terms: {
            title: 'Pogoji uporabe',
            intro: `S tem, ko ustvarite račun ali uporabljate ${SL}, se strinjate s temi pogoji.`,
            sections: [
                { h: 'Kdo upravlja storitev', p: [`${SL} upravlja ${OPERATOR}. Kontakt: ${CONTACT}.`] },
                {
                    h: 'Kdo jo lahko uporablja',
                    list: [
                        'Študenti z univerzitetnim e-naslovom, ki so stari vsaj 16 let.',
                        'Najemodajalci in agencije, ki jih pred objavo nastanitev preverimo.',
                        'Za en račun skrbi ena oseba. Za svoje geslo in vse, kar se zgodi z vašim računom, odgovarjate sami.',
                    ],
                },
                {
                    h: 'Kaj lahko objavite',
                    list: [
                        'Samo resnične nastanitve in predmete, ki jih smete oddati ali prodati, z resničnimi fotografijami, cenami in podatki.',
                        'Brez prevar, zavajanja, neželenih sporočil, žaljivih vsebin in diskriminacije (na primer glede narodnosti, vere, spola ali spolne usmerjenosti).',
                        'Brez stvari, ki jih zakon prepoveduje prodajati, in brez vsebin, ki kršijo pravice drugih.',
                    ],
                    after: ['Za svoje objave in sporočila odgovarjate sami. Dovolite nam, da jih prikazujemo v storitvi, dokler so objavljene.'],
                },
                {
                    h: 'Dogovori med uporabniki',
                    p: [
                        `${SL} povezuje ljudi, ni pa stranka v najemu ali nakupu. Plačila ne gredo prek nas. Nastanitev ali predmet si oglejte, preden plačate, in vedno podpišite pisno najemno pogodbo, kot jo zahteva zakon.`,
                        'Ne moremo jamčiti, da so vse objave in uporabniki resnični, čeprav študente in najemodajalce preverjamo. Sumljive objave prijavite z gumbom »Prijavi«.',
                    ],
                },
                {
                    h: 'Ocene',
                    p: ['Ocenite lahko samo ljudi, s katerimi ste se pogovarjali, trgovali ali bivali. Ocene naj bodo poštene in resnične. Ena oseba lahko drugo oceni enkrat; oceno lahko pozneje uredite.'],
                },
                {
                    h: 'Ko kdo krši pravila',
                    p: ['Objave, ki kršijo te pogoje, lahko odstranimo, račun pa začasno ali trajno zapremo. Če je mogoče, vam povemo, zakaj.'],
                },
                {
                    h: 'Odgovornost',
                    p: ['Storitev ponujamo takšno, kot je, in si prizadevamo, da deluje brez prekinitev. Ne odgovarjamo za dogovore med uporabniki ali škodo, ki iz njih nastane, razen kadar to zahteva zakon.'],
                },
                {
                    h: 'Izbris računa',
                    p: ['Račun lahko kadar koli izbrišete v Moj profil → Račun. Kaj se pri tem izbriše, piše v Pravilniku o zasebnosti.'],
                },
                {
                    h: 'Spremembe in pravo',
                    p: ['O bistvenih spremembah teh pogojev vas obvestimo vnaprej. Za te pogoje velja pravo Republike Slovenije; za spore je pristojno sodišče v [kraj].'],
                },
            ],
        },
    },
    en: {
        updatedLabel: 'Last updated',
        updated: UPDATED,
        otherPrivacy: 'Privacy policy',
        otherTerms: 'Terms of use',
        privacy: {
            title: 'Privacy policy',
            intro: `${EN} is a website for students in Slovenia: housing, a marketplace and help with settling in. This page says what we keep about you, why, who else sees it and how you delete it.`,
            sections: [
                { h: 'Who is responsible', p: [`The controller of your personal data is ${OPERATOR_EN}. For any question about your data, write to ${CONTACT_EN}.`] },
                {
                    h: 'What we collect',
                    list: [
                        'Your account: full name, email address (a university email for students), password (stored only as a hash we can’t read), role (student or landlord), and for landlords a phone number that is never shown to others.',
                        'Your profile: a photo and a bio, if you add them.',
                        'The rental profile (students only): university, faculty, studies, date of birth (others only see your age), home country and town, languages, smoking, pets, lifestyle, budget, move-in date and how long you want to stay.',
                        'What you post: housing listings and marketplace items, their photos, descriptions and location. Only you see the exact pin on the map; everyone else sees an area of about 200 m around a point that has been moved.',
                        'The messages you send, and which listing or item a conversation is about.',
                        'Reviews you write and receive, reports, the listings and items you like, and stays (who lived in which place).',
                        'Technical data: the server’s request log (what was asked for, when and by which account), which we need to fix errors and keep the service safe.',
                    ],
                    after: ['We don’t use advertising cookies or tracking tools. The browser only keeps your login, your language and the page to return to after signing up.'],
                },
                {
                    h: 'Why, and on what basis',
                    list: [
                        'So you can use the service (account, posts, messages, reviews): this is performing our contract with you (Article 6(1)(b) GDPR).',
                        'To keep the service safe (checking student emails and landlords, reports, preventing scams and abuse, logs): our legitimate interest (Article 6(1)(f)).',
                        'We only send emails about your account (confirmation, password reset). We don’t send marketing emails.',
                    ],
                },
                {
                    h: 'Who else sees your data',
                    list: [
                        'Other users see what is on your profile and in your posts. Landlords you write to see your rental profile. People you talk to see your messages.',
                        'Visitors without an account only see trimmed listings: no names, descriptions, streets or exact locations.',
                        `Providers that process data for us: ${HOSTING_EN} (server and database), Amazon Web Services (photo storage and sending email) and OpenStreetMap (the map; an address you look up in the listing form is sent to their Nominatim service).`,
                        'We don’t sell your data or give it to advertisers.',
                    ],
                },
                {
                    h: 'How long we keep it',
                    p: [
                        'As long as you have an account. When you delete it (My profile → Account → Delete account), your profile, listings, items, messages, reviews, likes, reports and stays are deleted right away, and so are all the photos you uploaded.',
                        'Backups and server logs are deleted automatically within [30] days.',
                    ],
                },
                {
                    h: 'Your rights',
                    p: [
                        `You have the right to access your data, correct it, delete it, restrict or object to its processing, and take it with you. You can do most of this yourself in your profile; for the rest, write to ${CONTACT_EN}. We answer within one month.`,
                        'If you think we handle your data wrongly, you can complain to the Slovenian Information Commissioner (www.ip-rs.si).',
                    ],
                },
                { h: 'Age', p: ['You need to be at least 16 to use the service.'] },
                { h: 'Changes', p: ['If we change this policy in an important way, we tell you in the app or by email.'] },
            ],
        },
        terms: {
            title: 'Terms of use',
            intro: `By creating an account or using ${EN}, you agree to these terms.`,
            sections: [
                { h: 'Who runs the service', p: [`${EN} is run by ${OPERATOR_EN}. Contact: ${CONTACT_EN}.`] },
                {
                    h: 'Who can use it',
                    list: [
                        'Students with a university email address who are at least 16.',
                        'Landlords and agencies, whom we check before their places go live.',
                        'One account belongs to one person. You are responsible for your password and for everything done with your account.',
                    ],
                },
                {
                    h: 'What you can post',
                    list: [
                        'Only real places and items that you are allowed to rent out or sell, with real photos, prices and details.',
                        'No scams, misleading posts, spam, abuse or discrimination (for example by nationality, religion, gender or sexual orientation).',
                        'Nothing the law forbids selling, and nothing that breaks other people’s rights.',
                    ],
                    after: ['You are responsible for your posts and messages. You let us show them in the service for as long as they are posted.'],
                },
                {
                    h: 'Deals between users',
                    p: [
                        `${EN} connects people; it is not a party to any rental or sale. No payments go through us. See the place or the item before you pay, and always sign a written lease, as the law requires.`,
                        'We check students and landlords, but we can’t guarantee that every post and every user is genuine. Report anything suspicious with the “Report” button.',
                    ],
                },
                {
                    h: 'Reviews',
                    p: ['You can only review people you have talked to, traded with or lived with. Keep reviews fair and true. One person can review another once, and can edit that review later.'],
                },
                {
                    h: 'When someone breaks the rules',
                    p: ['We may remove posts that break these terms and suspend or close the account. Where we can, we tell you why.'],
                },
                {
                    h: 'Liability',
                    p: ['We offer the service as it is and do our best to keep it running. We are not liable for deals between users or for damage that comes from them, except where the law says otherwise.'],
                },
                {
                    h: 'Deleting your account',
                    p: ['You can delete your account at any time in My profile → Account. The privacy policy says what is deleted.'],
                },
                {
                    h: 'Changes and law',
                    p: ['We tell you in advance about important changes to these terms. These terms are governed by the law of the Republic of Slovenia; disputes go to the court in [town].'],
                },
            ],
        },
    },
};
