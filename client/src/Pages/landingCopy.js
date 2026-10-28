// All landing page text in Slovenian and English.
// Slovenian is the default: Slovenian law (ZJRS) requires websites aimed at
// customers in Slovenia to be in Slovenian; other languages may be added.
// Students are addressed informally ("ti"), homeowners formally ("vi").

export const LANGUAGES = ['sl', 'en'];

export const copy = {
    sl: {
        nav: { login: 'Prijava', signup: 'Registracija' },
        hero: {
            eyebrow: 'Za študente v Sloveniji',
            title: 'Tvoje študentsko življenje v Sloveniji, na enem mestu.',
            text: 'Kupuj in prodajaj med študenti, najdi sobo, ki ji lahko zaupaš, izkoristi študentske ugodnosti in se hitreje znajdi. Pridružiš se lahko samo s potrjenim univerzitetnim e-naslovom.',
            student: 'Pridruži se kot študent',
            owner: 'Oddajam sobo',
            open: 'Odprto za študente Univerze v Ljubljani, Univerze v Mariboru in Univerze na Primorskem.',
            examples: 'Primeri',
            card1: { title: 'Namizna svetilka', meta: 'Koper · tržnica', price: '8 €' },
            card2: { title: 'Soba v Ljubljani', meta: 'Iščemo 2 študenta', price: '290 € / osebo' },
            card3: { title: 'Študentska ugodnost', meta: 'Servis koles', price: '−15 %' },
        },
        features: {
            title: 'Kaj vse ponujamo',
            live: 'Na voljo', soon: 'Kmalu', later: 'Pozneje',
            items: [
                { key: 'market', title: 'Tržnica', text: 'Kupuj in prodajaj knjige, pohištvo, kolesa in vse vmes s študenti s tvoje univerze.' },
                { key: 'chat', title: 'Sporočila', text: 'Klepetaj neposredno v aplikaciji. Telefonsko številko deliš šele, ko to želiš.' },
                { key: 'housing', title: 'Bivanje', text: 'Preverjene sobe in stanovanja. Prijaviš se s svojim profilom, sam ali s sostanovalcem, namesto da kličeš okoli.' },
                { key: 'perks', title: 'Študentske ugodnosti', text: 'Popusti in ponudbe lokalnih trgovin, storitev in aplikacij, samo za potrjene študente.' },
                { key: 'guide', title: 'Vodnik po Sloveniji', text: 'Prijava prebivališča, bančni račun, prevoz, SIM kartica: seznam za prvi mesec za tuje študente, najprej za študente iz Severne Makedonije.' },
                { key: 'community', title: 'Skupnost', text: 'Skupine za tvojo univerzo in mesto: poišči sostanovalce, družbo za učenje in dogodke.' },
            ],
        },
        steps: {
            title: 'Kako deluje za študente',
            items: [
                { title: 'Registriraj se z univerzitetnim e-naslovom', text: 'Poslali ti bomo povezavo za potrditev. Tako vsak tukaj ve, da posluje s pravim študentom.' },
                { title: 'Kupuj, prodajaj in klepetaj', text: 'Oglas objaviš v minuti, prodajalcu pa pišeš kar iz oglasa.' },
                { title: 'Najdi svoj prostor', text: 'Ko odpremo bivanje, se na sobe prijaviš s svojim profilom in odgovore dobiš v aplikaciji.' },
            ],
            cta: 'Ustvari račun',
        },
        owners: {
            eyebrow: 'Za lastnike in agencije',
            title: 'Oddajate študentom?',
            text: 'Student Trade vas bo povezal s potrjenimi študenti, ki iščejo sobe, stanovanja in skupne hiše.',
            points: [
                'Prijavijo se samo potrjeni študenti, s profilom, ki ga preberete, še preden se srečate.',
                'Prijave in pogovori na enem mestu, namesto klicev ob vseh urah.',
                'Jasen postopek: pregled oglasa, ogled po videu, pisna pogodba.',
            ],
            signupText: 'Želite objaviti oglas že zdaj?',
            signupLink: 'Ustvarite račun za najemodajalce',
        },
        form: {
            title: 'Pustite nam svoje podatke in oglasili se bomo, ko odpremo bivanje.',
            type: 'Sem',
            types: { homeowner: 'Lastnik nepremičnine', agency: 'Nepremičninska agencija', partner: 'Podjetje ali organizacija' },
            name: 'Ime in priimek',
            email: 'E-naslov',
            phone: 'Telefon (neobvezno)',
            city: 'Mesto',
            message: 'Sporočilo (neobvezno)',
            consent: 'Strinjam se, da me Student Trade kontaktira glede oddaje ali sodelovanja. Podatkov ne bomo uporabili za nič drugega.',
            submit: 'Pošlji',
            sending: 'Pošiljam…',
            success: 'Hvala! Kmalu se vam oglasimo.',
            errors: {
                name: 'Vpišite svoje ime.',
                email: 'Vpišite veljaven e-naslov.',
                consent: 'Za nadaljevanje potrdite soglasje.',
            },
        },
        partners: {
            title: 'Ponudite študentsko ugodnost',
            text: 'Trgovine, storitve, aplikacije, klubi in organizacije, ki pomagajo študentom: pogovorimo se.',
            cta: 'Stopite v stik',
        },
        footer: { made: 'Ustvarili študenti v Kopru, Slovenija.' },
    },

    en: {
        nav: { login: 'Log in', signup: 'Sign up' },
        hero: {
            eyebrow: 'For students in Slovenia',
            title: 'Your student life in Slovenia, in one place.',
            text: 'Buy and sell with other students, find a room you can trust, get student deals and settle in faster. Only verified university emails can join.',
            student: 'Join as a student',
            owner: 'I have a room to rent',
            open: 'Open to students of the University of Ljubljana, University of Maribor and University of Primorska.',
            examples: 'Examples',
            card1: { title: 'Desk lamp', meta: 'Koper · marketplace', price: '€8' },
            card2: { title: 'Room in Ljubljana', meta: 'Looking for 2 students', price: '€290 / person' },
            card3: { title: 'Student deal', meta: 'Bike repair shop', price: '−15%' },
        },
        features: {
            title: "What's inside",
            live: 'Live', soon: 'Coming soon', later: 'Later',
            items: [
                { key: 'market', title: 'Marketplace', text: 'Buy and sell books, furniture, bikes and everything in between with students from your university.' },
                { key: 'chat', title: 'Messages', text: 'Chat right in the app. Share your phone number only when you want to.' },
                { key: 'housing', title: 'Housing', text: 'Verified rooms and flats. Apply with your profile, alone or with a roommate, instead of calling around.' },
                { key: 'perks', title: 'Student deals', text: 'Discounts and offers from local shops, services and apps, only for verified students.' },
                { key: 'guide', title: 'Guide to Slovenia', text: 'Address registration, bank account, transport, SIM card: the first-month checklist for international students, starting with students from North Macedonia.' },
                { key: 'community', title: 'Community', text: 'Groups for your university and city: find roommates, study buddies and events.' },
            ],
        },
        steps: {
            title: 'How it works for students',
            items: [
                { title: 'Sign up with your university email', text: "We send you a confirmation link. That's how everyone here knows they're dealing with a real student." },
                { title: 'Buy, sell and chat', text: 'Post an item in a minute, or message a seller straight from their listing.' },
                { title: 'Find your place', text: 'When housing opens, apply to rooms with your profile and get answers in the app.' },
            ],
            cta: 'Create an account',
        },
        owners: {
            eyebrow: 'For homeowners and agencies',
            title: 'Renting to students?',
            text: 'Student Trade will connect you with verified students looking for rooms, flats and shared houses.',
            points: [
                'Only verified students apply, with a profile you can read before you meet.',
                'Applications and chat in one place, instead of calls at all hours.',
                'A clear process: listing check, video viewing, written contract.',
            ],
            signupText: 'Want to post a place right now?',
            signupLink: 'Create a landlord account',
        },
        form: {
            title: "Leave your details and we'll contact you when housing opens.",
            type: 'I am a',
            types: { homeowner: 'Homeowner', agency: 'Real estate agency', partner: 'Business or organization' },
            name: 'Full name',
            email: 'Email',
            phone: 'Phone (optional)',
            city: 'City',
            message: 'Message (optional)',
            consent: "I agree that Student Trade may contact me about listing or partnering. We won't use your details for anything else.",
            submit: 'Send',
            sending: 'Sending…',
            success: "Thanks! We'll be in touch soon.",
            errors: {
                name: 'Please enter your name.',
                email: 'Please enter a valid email address.',
                consent: 'Please agree to be contacted to continue.',
            },
        },
        partners: {
            title: 'Offer a student deal',
            text: "Shops, services, apps, clubs and organizations that help students: let's talk.",
            cta: 'Get in touch',
        },
        footer: { made: 'Made by students in Koper, Slovenia.' },
    },
};
