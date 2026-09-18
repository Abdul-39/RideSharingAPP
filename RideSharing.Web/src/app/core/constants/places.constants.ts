export type PlaceArea = 'Islamabad' | 'Rawalpindi' | 'Twin Cities';
export type PlaceCategory = 'Sector' | 'Commercial' | 'University' | 'Hospital' | 'Housing Society' | 'Transit/Chowk';

export interface CommutePlace {
  name: string;
  lat: number;
  lng: number;
  area: PlaceArea | string;
  category: PlaceCategory | string;
}

export const RAWALPINDI_ISLAMABAD_PLACES: CommutePlace[] = [
  // ==========================================
  // ISLAMABAD — SECTORS & MARKAZES
  // ==========================================
  { name: 'F-6 Markaz (Super Market), Islamabad', lat: 33.7297, lng: 73.0768, area: 'Islamabad', category: 'Sector' },
  { name: 'F-7 Markaz (Jinnah Super Market), Islamabad', lat: 33.7208, lng: 73.0569, area: 'Islamabad', category: 'Sector' },
  { name: 'F-8 Markaz (Ayub Market), Islamabad', lat: 33.7107, lng: 73.0366, area: 'Islamabad', category: 'Sector' },
  { name: 'F-10 Markaz, Islamabad', lat: 33.6922, lng: 73.0118, area: 'Islamabad', category: 'Sector' },
  { name: 'F-11 Markaz, Islamabad', lat: 33.6835, lng: 72.9912, area: 'Islamabad', category: 'Sector' },
  { name: 'G-6 Markaz (Melody Market & Aabpara), Islamabad', lat: 33.7095, lng: 73.0825, area: 'Islamabad', category: 'Sector' },
  { name: 'G-7 Markaz (Sitara Market), Islamabad', lat: 33.7025, lng: 73.0645, area: 'Islamabad', category: 'Sector' },
  { name: 'G-8 Markaz, Islamabad', lat: 33.6925, lng: 73.0425, area: 'Islamabad', category: 'Sector' },
  { name: 'G-9 Markaz (Karachi Company / Peshawar Morr), Islamabad', lat: 33.6841, lng: 73.0315, area: 'Islamabad', category: 'Sector' },
  { name: 'G-10 Markaz, Islamabad', lat: 33.6765, lng: 73.0125, area: 'Islamabad', category: 'Sector' },
  { name: 'G-11 Markaz, Islamabad', lat: 33.6687, lng: 73.0039, area: 'Islamabad', category: 'Sector' },
  { name: 'G-13 Markaz, Islamabad', lat: 33.6450, lng: 72.9700, area: 'Islamabad', category: 'Sector' },
  { name: 'G-14 Sector, Islamabad', lat: 33.6350, lng: 72.9550, area: 'Islamabad', category: 'Sector' },
  { name: 'G-15 (Jammu & Kashmir Housing Society), Islamabad', lat: 33.6265, lng: 72.9385, area: 'Islamabad', category: 'Sector' },
  { name: 'E-7 Sector, Margalla Road, Islamabad', lat: 33.7325, lng: 73.0450, area: 'Islamabad', category: 'Sector' },
  { name: 'E-8 Sector (Naval Complex), Islamabad', lat: 33.7196, lng: 73.0385, area: 'Islamabad', category: 'Sector' },
  { name: 'E-9 Sector (PAF Complex), Islamabad', lat: 33.7153, lng: 73.0245, area: 'Islamabad', category: 'Sector' },
  { name: 'E-11 Markaz (Golra Morr / MPCHS), Islamabad', lat: 33.6980, lng: 72.9780, area: 'Islamabad', category: 'Sector' },
  { name: 'H-8 Sector (HEC & Board Office), Islamabad', lat: 33.6815, lng: 73.0685, area: 'Islamabad', category: 'Sector' },
  { name: 'H-9 Sector (Sunday Bazaar & Technical Board), Islamabad', lat: 33.6720, lng: 73.0450, area: 'Islamabad', category: 'Sector' },
  { name: 'H-10 Sector, Islamabad', lat: 33.6593, lng: 73.0242, area: 'Islamabad', category: 'Sector' },
  { name: 'H-11 Sector (Police Lines), Islamabad', lat: 33.6555, lng: 73.0153, area: 'Islamabad', category: 'Sector' },
  { name: 'H-12 Sector, Islamabad', lat: 33.6428, lng: 72.9904, area: 'Islamabad', category: 'Sector' },
  { name: 'H-13 Sector, Islamabad', lat: 33.6330, lng: 72.9700, area: 'Islamabad', category: 'Sector' },
  { name: 'I-8 Markaz, Islamabad', lat: 33.6677, lng: 73.0754, area: 'Islamabad', category: 'Sector' },
  { name: 'I-9 Markaz & Industrial Area, Islamabad', lat: 33.6580, lng: 73.0580, area: 'Islamabad', category: 'Sector' },
  { name: 'I-10 Markaz, Islamabad', lat: 33.6480, lng: 73.0390, area: 'Islamabad', category: 'Sector' },
  { name: 'I-11 (Fruit & Vegetable Mandi), Islamabad', lat: 33.6390, lng: 73.0210, area: 'Islamabad', category: 'Sector' },
  { name: 'I-14 Sector, Islamabad', lat: 33.6180, lng: 72.9750, area: 'Islamabad', category: 'Sector' },
  { name: 'Diplomatic Enclave (G-5), Islamabad', lat: 33.7235, lng: 73.1042, area: 'Islamabad', category: 'Sector' },

  // ==========================================
  // ISLAMABAD — MAJOR HUBS, AVENUES & CENTERS
  // ==========================================
  { name: 'Blue Area (Jinnah Avenue), Islamabad', lat: 33.7126, lng: 73.0583, area: 'Islamabad', category: 'Commercial' },
  { name: 'Zero Point Interchange, Islamabad', lat: 33.6938, lng: 73.0652, area: 'Islamabad', category: 'Transit/Chowk' },
  { name: 'Centaurus Mall, Sector F-8, Islamabad', lat: 33.7082, lng: 73.0514, area: 'Islamabad', category: 'Commercial' },
  { name: 'Pak Secretariat, Constitution Avenue, Islamabad', lat: 33.7380, lng: 73.0934, area: 'Islamabad', category: 'Commercial' },
  { name: 'D-Chowk, Jinnah Avenue, Islamabad', lat: 33.7330, lng: 73.0880, area: 'Islamabad', category: 'Transit/Chowk' },
  { name: 'Fatima Jinnah Park (F-9 Park Gate 2), Islamabad', lat: 33.7020, lng: 73.0180, area: 'Islamabad', category: 'Commercial' },
  { name: 'Shakarparian & Pakistan Monument, Islamabad', lat: 33.6930, lng: 73.0680, area: 'Islamabad', category: 'Commercial' },
  { name: 'Rawal Lake & Lake View Park, Islamabad', lat: 33.7085, lng: 73.1250, area: 'Islamabad', category: 'Commercial' },
  { name: 'Saidpur Village, Margalla Hills, Islamabad', lat: 33.7420, lng: 73.0710, area: 'Islamabad', category: 'Commercial' },
  { name: 'Daman-e-Koh / Pir Sohawa Road, Islamabad', lat: 33.7435, lng: 73.0580, area: 'Islamabad', category: 'Commercial' },
  { name: 'Islamabad Club, Murree Road, Islamabad', lat: 33.7050, lng: 73.1090, area: 'Islamabad', category: 'Commercial' },

  // ==========================================
  // ISLAMABAD — EXPRESSWAY & SOUTHERN HOUSING
  // ==========================================
  { name: 'Faizabad Interchange, Islamabad', lat: 33.6631, lng: 73.0845, area: 'Twin Cities', category: 'Transit/Chowk' },
  { name: 'Khanna Pul, Islamabad Expressway', lat: 33.6366, lng: 73.1169, area: 'Islamabad', category: 'Transit/Chowk' },
  { name: 'Koral Chowk, Islamabad Expressway', lat: 33.6067, lng: 73.1425, area: 'Islamabad', category: 'Transit/Chowk' },
  { name: 'Gulberg Greens, Islamabad Expressway', lat: 33.5850, lng: 73.1550, area: 'Islamabad', category: 'Housing Society' },
  { name: 'PWD Housing Society, Islamabad', lat: 33.5780, lng: 73.1450, area: 'Islamabad', category: 'Housing Society' },
  { name: 'Pakistan Town, Islamabad', lat: 33.5720, lng: 73.1400, area: 'Islamabad', category: 'Housing Society' },
  { name: 'National Police Foundation (O-9), Islamabad', lat: 33.5650, lng: 73.1380, area: 'Islamabad', category: 'Housing Society' },
  { name: 'Soan Gardens, Islamabad Expressway', lat: 33.5600, lng: 73.1520, area: 'Islamabad', category: 'Housing Society' },
  { name: 'CBR Town Phase 1, Islamabad', lat: 33.5550, lng: 73.1350, area: 'Islamabad', category: 'Housing Society' },
  { name: 'DHA Phase 2 (Gate 1 - World Trade Center / Giga Mall), Islamabad', lat: 33.5218, lng: 73.1558, area: 'Twin Cities', category: 'Housing Society' },
  { name: 'DHA Phase 2 (Gate 2 / Gate 3), Islamabad', lat: 33.5260, lng: 73.1620, area: 'Islamabad', category: 'Housing Society' },
  { name: 'DHA Phase 5, Islamabad Expressway', lat: 33.5150, lng: 73.1700, area: 'Islamabad', category: 'Housing Society' },
  { name: 'River Garden Housing Society, Islamabad', lat: 33.5580, lng: 73.1600, area: 'Islamabad', category: 'Housing Society' },
  { name: 'Korang Town, Islamabad Expressway', lat: 33.5890, lng: 73.1360, area: 'Islamabad', category: 'Housing Society' },
  { name: 'Ghauri Town (Phases 1 to 5), Islamabad', lat: 33.6300, lng: 73.1250, area: 'Islamabad', category: 'Housing Society' },

  // ==========================================
  // ISLAMABAD — SUBURBS & OUTSKIRTS
  // ==========================================
  { name: 'Bani Gala (Main Bazaar), Islamabad', lat: 33.7150, lng: 73.1550, area: 'Islamabad', category: 'Housing Society' },
  { name: 'Bhara Kahu (Murree Road / Bypass), Islamabad', lat: 33.7450, lng: 73.1800, area: 'Islamabad', category: 'Transit/Chowk' },
  { name: 'Tarlai Kalan, Lehtrar Road, Islamabad', lat: 33.6350, lng: 73.1480, area: 'Islamabad', category: 'Transit/Chowk' },
  { name: 'Chak Shahzad, Park Road, Islamabad', lat: 33.6620, lng: 73.1450, area: 'Islamabad', category: 'Housing Society' },
  { name: 'National Institute of Health (NIH), Chak Shahzad', lat: 33.6580, lng: 73.1350, area: 'Islamabad', category: 'Hospital' },
  { name: 'Bahria Enclave (Sector A & B), Islamabad', lat: 33.6950, lng: 73.2350, area: 'Islamabad', category: 'Housing Society' },
  { name: 'Islamabad International Airport (Terminal & Metro Station)', lat: 33.5594, lng: 72.8272, area: 'Twin Cities', category: 'Transit/Chowk' },

  // ==========================================
  // RAWALPINDI — CANTT & SADDAR
  // ==========================================
  { name: 'Saddar (Bank Road / Cantt), Rawalpindi', lat: 33.5932, lng: 73.0551, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Mall Road (Flashman’s Hotel / PC Hotel), Rawalpindi Cantt', lat: 33.5950, lng: 73.0510, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Rawalpindi Railway Station, Cantt', lat: 33.5986, lng: 73.0488, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Haider Road, Saddar, Rawalpindi', lat: 33.5945, lng: 73.0535, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'GHQ / CMH / Military Hospital (MH), Rawalpindi Cantt', lat: 33.5880, lng: 73.0530, area: 'Rawalpindi', category: 'Hospital' },
  { name: 'Peshawar Road (Chairing Cross), Rawalpindi', lat: 33.6020, lng: 73.0250, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Chur Chowk, Peshawar Road, Rawalpindi', lat: 33.6080, lng: 73.0150, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Koh-e-Noor Mills, Peshawar Road, Rawalpindi', lat: 33.6150, lng: 73.0050, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Westridge 1, Rawalpindi Cantt', lat: 33.6120, lng: 73.0280, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Westridge 2, Rawalpindi Cantt', lat: 33.6180, lng: 73.0220, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Westridge 3, Rawalpindi Cantt', lat: 33.6240, lng: 73.0180, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Race Course Ground, Rawalpindi Cantt', lat: 33.5820, lng: 73.0420, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Tench Bhatta, Rawalpindi Cantt', lat: 33.5780, lng: 73.0320, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Lalkurti, Rawalpindi Cantt', lat: 33.5820, lng: 73.0580, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Dheri Hassanabad, Rawalpindi Cantt', lat: 33.5750, lng: 73.0520, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Kamran Market, Saddar, Rawalpindi', lat: 33.5960, lng: 73.0520, area: 'Rawalpindi', category: 'Commercial' },

  // ==========================================
  // RAWALPINDI — SATELLITE TOWN & MURREE ROAD
  // ==========================================
  { name: 'Commercial Market, Satellite Town, Rawalpindi', lat: 33.6335, lng: 73.0694, area: 'Rawalpindi', category: 'Commercial' },
  { name: '4th Road, Satellite Town, Rawalpindi', lat: 33.6380, lng: 73.0680, area: 'Rawalpindi', category: 'Housing Society' },
  { name: '5th Road, Commercial Market, Rawalpindi', lat: 33.6350, lng: 73.0710, area: 'Rawalpindi', category: 'Commercial' },
  { name: '6th Road (Metro Bus Station / Murree Road), Rawalpindi', lat: 33.6420, lng: 73.0760, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: '7th Road, Murree Road, Rawalpindi', lat: 33.6460, lng: 73.0780, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Chandni Chowk (Metro Bus Station), Murree Road, Rawalpindi', lat: 33.6290, lng: 73.0710, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Committee Chowk, Murree Road, Rawalpindi', lat: 33.6180, lng: 73.0650, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Liaquat Bagh, Murree Road, Rawalpindi', lat: 33.6120, lng: 73.0600, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Mareer Chowk / Mareer Hassan, Murree Road, Rawalpindi', lat: 33.6030, lng: 73.0580, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Asghar Mall Scheme, Rawalpindi', lat: 33.6220, lng: 73.0640, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Double Road (Cricket Stadium / Shamsabad), Rawalpindi', lat: 33.6480, lng: 73.0780, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Pandora Chungi, Rawalpindi', lat: 33.6380, lng: 73.0820, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Muslim Town, Rawalpindi', lat: 33.6280, lng: 73.0880, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Sadiqabad, Rawalpindi', lat: 33.6240, lng: 73.0950, area: 'Rawalpindi', category: 'Housing Society' },

  // ==========================================
  // RAWALPINDI — OLD CITY & BAZAARS
  // ==========================================
  { name: 'Raja Bazaar / Fawara Chowk, Rawalpindi', lat: 33.6060, lng: 73.0540, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Bara Market, Rawalpindi City', lat: 33.6070, lng: 73.0520, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Moti Bazaar, Rawalpindi City', lat: 33.6080, lng: 73.0550, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Bhabra Bazaar / Purana Qila, Rawalpindi', lat: 33.6040, lng: 73.0580, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Kalan Bazaar, Rawalpindi', lat: 33.6050, lng: 73.0560, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Ganj Mandi, Rawalpindi City', lat: 33.6120, lng: 73.0480, area: 'Rawalpindi', category: 'Commercial' },

  // ==========================================
  // RAWALPINDI — CHAKLALA & AIRPORT ROAD
  // ==========================================
  { name: 'Chaklala Scheme 3 (Commercial Area), Rawalpindi', lat: 33.5855, lng: 73.0883, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Chaklala Garrison / Old Airport Road, Rawalpindi', lat: 33.5950, lng: 73.0920, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Gulzar-e-Quaid, Rawalpindi', lat: 33.6080, lng: 73.1150, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Airport Housing Society, Rawalpindi', lat: 33.6150, lng: 73.1250, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Judicial Town, Rawalpindi', lat: 33.6020, lng: 73.1280, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'VIP Colony, Chaklala, Rawalpindi', lat: 33.5880, lng: 73.0820, area: 'Rawalpindi', category: 'Housing Society' },

  // ==========================================
  // RAWALPINDI — KACHEHRI, MORGAH & SOUTHERN
  // ==========================================
  { name: 'Kachehri Chowk, Rawalpindi', lat: 33.5786, lng: 73.0642, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Ayub National Park (Topi Rakh), Rawalpindi', lat: 33.5680, lng: 73.0780, area: 'Rawalpindi', category: 'Commercial' },
  { name: 'Morgah (Attock Oil Refinery / Fauji Foundation), Rawalpindi', lat: 33.5550, lng: 73.0850, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Al-Shifa Trust Eye Hospital, GT Road, Rawalpindi', lat: 33.5580, lng: 73.0720, area: 'Rawalpindi', category: 'Hospital' },
  { name: 'Rawat (T-Chowk / GT Road Junction), Rawalpindi', lat: 33.4950, lng: 73.1950, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Giga Mall (World Trade Center), DHA Phase 2, GT Road', lat: 33.5222, lng: 73.1611, area: 'Twin Cities', category: 'Commercial' },

  // ==========================================
  // RAWALPINDI — BAHRIA TOWN & DHA
  // ==========================================
  { name: 'Bahria Town Phase 1, Rawalpindi', lat: 33.5450, lng: 73.1120, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bahria Town Phase 2, Rawalpindi', lat: 33.5400, lng: 73.1150, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bahria Town Phase 3, Rawalpindi', lat: 33.5350, lng: 73.1100, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bahria Town Phase 4 (Civic Center / Arena), Rawalpindi', lat: 33.5244, lng: 73.1044, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bahria Town Phase 5, Rawalpindi', lat: 33.5180, lng: 73.1080, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bahria Town Phase 6, Rawalpindi', lat: 33.5120, lng: 73.1050, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bahria Town Phase 7 (Clock Tower / Spring North), Rawalpindi', lat: 33.5180, lng: 73.0880, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bahria Town Phase 8 (Awami Complex / Sector F), Rawalpindi', lat: 33.5050, lng: 73.0750, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Safari Villas (Phase 1 & 2), Bahria Town, Rawalpindi', lat: 33.5280, lng: 73.1020, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'DHA Phase 1 (Defence Villas / Sector A-F), Rawalpindi', lat: 33.5450, lng: 73.0980, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Askari 7, Rawalpindi Cantt', lat: 33.5900, lng: 73.0380, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Askari 10, Rawalpindi', lat: 33.6050, lng: 73.1180, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Askari 13, Rawalpindi Cantt', lat: 33.5780, lng: 73.0250, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Askari 14 (Sector A & B), Adyala Road, Rawalpindi', lat: 33.5680, lng: 73.0200, area: 'Rawalpindi', category: 'Housing Society' },

  // ==========================================
  // RAWALPINDI — ADYALA, DHAMIAL & CHUNGI
  // ==========================================
  { name: 'Adyala Road (Kachehri to Bakra Mandi), Rawalpindi', lat: 33.5600, lng: 73.0450, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Adyala Road (Khawaja Corporation / Gulshan-e-Abad), Rawalpindi', lat: 33.5250, lng: 73.0180, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Dhamial Road, Rawalpindi', lat: 33.5650, lng: 73.0100, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Kalma Chowk, Dhamial, Rawalpindi', lat: 33.5550, lng: 73.0020, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Chungi No. 22, Rawalpindi Cantt', lat: 33.5780, lng: 73.0450, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Chungi No. 4, Rawalpindi', lat: 33.6120, lng: 73.0480, area: 'Rawalpindi', category: 'Transit/Chowk' },

  // ==========================================
  // RAWALPINDI — PIRWADHAI & I.J.P. ROAD
  // ==========================================
  { name: 'Pirwadhai Bus Stand (General Bus Stand), Rawalpindi', lat: 33.6380, lng: 73.0320, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'Pirwadhai Mor, I.J.P. Road, Rawalpindi', lat: 33.6420, lng: 73.0380, area: 'Rawalpindi', category: 'Transit/Chowk' },
  { name: 'I.J.P. Road (Karnal Sher Khan Shaheed Road), Twin Cities', lat: 33.6450, lng: 73.0550, area: 'Twin Cities', category: 'Transit/Chowk' },
  { name: 'Khayaban-e-Sir Syed (Sector 1, 2, 3), Rawalpindi', lat: 33.6350, lng: 73.0480, area: 'Rawalpindi', category: 'Housing Society' },
  { name: 'Bangash Colony, Pirwadhai, Rawalpindi', lat: 33.6310, lng: 73.0390, area: 'Rawalpindi', category: 'Housing Society' },

  // ==========================================
  // UNIVERSITIES & EDUCATIONAL INSTITUTIONS
  // ==========================================
  { name: 'NUST (National University of Sciences & Tech), H-12 Campus, Islamabad', lat: 33.6428, lng: 72.9904, area: 'Islamabad', category: 'University' },
  { name: 'FAST-NUCES, H-11 Campus, Islamabad', lat: 33.6555, lng: 73.0153, area: 'Islamabad', category: 'University' },
  { name: 'COMSATS University Islamabad, Park Road, Chak Shahzad', lat: 33.6517, lng: 73.1566, area: 'Islamabad', category: 'University' },
  { name: 'Quaid-e-Azam University (QAU), Islamabad', lat: 33.7478, lng: 73.1367, area: 'Islamabad', category: 'University' },
  { name: 'International Islamic University (IIUI), H-10 Campus, Islamabad', lat: 33.6593, lng: 73.0242, area: 'Islamabad', category: 'University' },
  { name: 'NUML (National University of Modern Languages), H-9 Campus, Islamabad', lat: 33.6650, lng: 73.0420, area: 'Islamabad', category: 'University' },
  { name: 'Air University, Sector E-9 (PAF Complex), Islamabad', lat: 33.7153, lng: 73.0245, area: 'Islamabad', category: 'University' },
  { name: 'Bahria University, Sector E-8 (Naval Complex), Islamabad', lat: 33.7196, lng: 73.0385, area: 'Islamabad', category: 'University' },
  { name: 'Riphah International University, Sector I-14, Islamabad', lat: 33.6180, lng: 72.9750, area: 'Islamabad', category: 'University' },
  { name: 'Riphah International University (Al-Mizan Campus), Peshawar Road, Rawalpindi', lat: 33.6010, lng: 73.0310, area: 'Rawalpindi', category: 'University' },
  { name: 'Fatima Jinnah Women University (FJWU), The Mall, Rawalpindi', lat: 33.5925, lng: 73.0525, area: 'Rawalpindi', category: 'University' },
  { name: 'Pir Mehr Ali Shah Arid Agriculture University, Shamsabad, Murree Road, Rawalpindi', lat: 33.6495, lng: 73.0815, area: 'Rawalpindi', category: 'University' },
  { name: 'Foundation University Islamabad (FUI), DHA Phase 1, Rawalpindi', lat: 33.5410, lng: 73.1020, area: 'Rawalpindi', category: 'University' },
  { name: 'Rawalpindi Medical University (RMU / Holy Family Campus)', lat: 33.6325, lng: 73.0785, area: 'Rawalpindi', category: 'University' },
  { name: 'National Defence University (NDU), Sector E-9, Islamabad', lat: 33.7170, lng: 73.0280, area: 'Islamabad', category: 'University' },
  { name: 'SZABIST Islamabad Campus, Street 9, H-8/4, Islamabad', lat: 33.6780, lng: 73.0650, area: 'Islamabad', category: 'University' },
  { name: 'Roots Millennium / Future World School, Sector H-11/4, Islamabad', lat: 33.6520, lng: 73.0120, area: 'Islamabad', category: 'University' },
  { name: 'Beaconhouse Margalla Campus, Sector H-8/4, Islamabad', lat: 33.6790, lng: 73.0670, area: 'Islamabad', category: 'University' },

  // ==========================================
  // HOSPITALS & HEALTHCARE CENTERS
  // ==========================================
  { name: 'PIMS (Pakistan Institute of Medical Sciences), Sector G-8/3, Islamabad', lat: 33.6980, lng: 73.0480, area: 'Islamabad', category: 'Hospital' },
  { name: 'Shifa International Hospital, Sector H-8/4, Islamabad', lat: 33.6760, lng: 73.0720, area: 'Islamabad', category: 'Hospital' },
  { name: 'Holy Family Hospital, Satellite Town, Rawalpindi', lat: 33.6320, lng: 73.0780, area: 'Rawalpindi', category: 'Hospital' },
  { name: 'Benazir Bhutto Hospital (BBH / Rawalpindi General Hospital), Murree Road', lat: 33.6260, lng: 73.0700, area: 'Rawalpindi', category: 'Hospital' },
  { name: 'District Headquarters Hospital (DHQ), Raja Bazaar, Rawalpindi', lat: 33.6090, lng: 73.0560, area: 'Rawalpindi', category: 'Hospital' },
  { name: 'Armed Forces Institute of Cardiology (AFIC / NIHD), The Mall, Rawalpindi Cantt', lat: 33.5910, lng: 73.0490, area: 'Rawalpindi', category: 'Hospital' },
  { name: 'Kulsum International Hospital, Blue Area, Islamabad', lat: 33.7140, lng: 73.0560, area: 'Islamabad', category: 'Hospital' },
  { name: 'PAF Hospital, Sector E-9, Islamabad', lat: 33.7130, lng: 73.0260, area: 'Islamabad', category: 'Hospital' },
  { name: 'Quaid-e-Azam International Hospital (QIH), Near Golra Morr, Peshawar Road', lat: 33.6280, lng: 72.9650, area: 'Twin Cities', category: 'Hospital' }
];

export function findMatchingTwinCitiesPlaces(query: string, limit = 8): CommutePlace[] {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);

  const matched = RAWALPINDI_ISLAMABAD_PLACES.filter((p) => {
    const haystack = `${p.name} ${p.area} ${p.category}`.toLowerCase();
    return tokens.every((tok) => haystack.includes(tok));
  });

  return matched.slice(0, limit);
}

export function findClosestTwinCitiesPlace(lat: number, lng: number): CommutePlace {
  let closest = RAWALPINDI_ISLAMABAD_PLACES[0];
  let minD = Infinity;

  for (const p of RAWALPINDI_ISLAMABAD_PLACES) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < minD) {
      minD = d;
      closest = p;
    }
  }

  return closest;
}