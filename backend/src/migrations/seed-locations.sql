-- [SEED] Complete location data for 54 African countries with cities
-- Run after cleanup-locations.sql
-- No duplicates. All cities linked with proper country_id.

-- NIGERIA (37 states)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Nigeria', 'NG', '🇳🇬', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", state, "createdAt", "updatedAt") 
SELECT gen_random_uuid(), city_name, id, city_name, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Nigeria') c,
UNNEST(ARRAY['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
             'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
             'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
             'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
             'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara']) AS city_name;

-- ALGERIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Algeria', 'DZ', '🇩🇿', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Algeria') c,
UNNEST(ARRAY['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Djelfa', 'Sétif', 'Sidi Bel Abbès', 'Biskra']) AS city_name;

-- ANGOLA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Angola', 'AO', '🇦🇴', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Angola') c,
UNNEST(ARRAY['Luanda', 'Huambo', 'Lobito', 'Benguela', 'Kuito', 'Lubango', 'Malanje', 'Namibe', 'Soyo', 'Cabinda']) AS city_name;

-- BENIN (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Benin', 'BJ', '🇧🇯', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Benin') c,
UNNEST(ARRAY['Cotonou', 'Porto-Novo', 'Parakou', 'Djougou', 'Bohicon', 'Kandi', 'Abomey', 'Natitingou', 'Lokossa', 'Ouidah']) AS city_name;

-- BOTSWANA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Botswana', 'BW', '🇧🇼', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Botswana') c,
UNNEST(ARRAY['Gaborone', 'Francistown', 'Molepolole', 'Maun', 'Serowe', 'Selibe Phikwe', 'Kanye', 'Mochudi', 'Mahalapye', 'Palapye']) AS city_name;

-- BURKINA FASO (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Burkina Faso', 'BF', '🇧🇫', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Burkina Faso') c,
UNNEST(ARRAY['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora', 'Dédougou', 'Kaya', 'Fada N''gourma', 'Tenkodogo', 'Houndé']) AS city_name;

-- BURUNDI (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Burundi', 'BI', '🇧🇮', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Burundi') c,
UNNEST(ARRAY['Bujumbura', 'Gitega', 'Muyinga', 'Ngozi', 'Ruyigi', 'Kayanza', 'Bururi', 'Makamba', 'Rutana', 'Cibitoke']) AS city_name;

-- CAMEROON (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Cameroon', 'CM', '🇨🇲', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Cameroon') c,
UNNEST(ARRAY['Douala', 'Yaoundé', 'Garoua', 'Bamenda', 'Bafoussam', 'Maroua', 'Nkongsamba', 'Kumba', 'Buea', 'Limbe']) AS city_name;

-- CAPE VERDE (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Cape Verde', 'CV', '🇨🇻', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Cape Verde') c,
UNNEST(ARRAY['Praia', 'Mindelo', 'Santa Maria', 'Assomada', 'São Filipe', 'Pedra Badejo', 'Tarrafal', 'Porto Novo', 'Ribeira Grande', 'Espargos']) AS city_name;

-- CENTRAL AFRICAN REPUBLIC (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Central African Republic', 'CF', '🇨🇫', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Central African Republic') c,
UNNEST(ARRAY['Bangui', 'Bimbo', 'Berbérati', 'Carnot', 'Bambari', 'Bouar', 'Bossangoa', 'Bozoum', 'Sibut', 'Nola']) AS city_name;

-- CHAD (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Chad', 'TD', '🇹🇩', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Chad') c,
UNNEST(ARRAY['N''Djamena', 'Moundou', 'Sarh', 'Abéché', 'Kélo', 'Koumra', 'Pala', 'Am Timan', 'Bongor', 'Mongo']) AS city_name;

-- COMOROS (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Comoros', 'KM', '🇰🇲', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Comoros') c,
UNNEST(ARRAY['Moroni', 'Mutsamudu', 'Fomboni', 'Domoni', 'Tsimbeo', 'Mitsoudjé', 'Ouani', 'Sima', 'Mirontsi', 'Bambao']) AS city_name;

-- CONGO (BRAZZAVILLE) (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Congo (Brazzaville)', 'CG', '🇨🇬', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Congo (Brazzaville)') c,
UNNEST(ARRAY['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Owando', 'Ouesso', 'Madingou', 'Gamboma', 'Impfondo', 'Sibiti']) AS city_name;

-- CONGO (KINSHASA) (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Congo (Kinshasa)', 'CD', '🇨🇩', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Congo (Kinshasa)') c,
UNNEST(ARRAY['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani', 'Goma', 'Bukavu', 'Tshikapa', 'Kolwezi', 'Likasi']) AS city_name;

-- DJIBOUTI (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Djibouti', 'DJ', '🇩🇯', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Djibouti') c,
UNNEST(ARRAY['Djibouti City', 'Ali Sabieh', 'Tadjoura', 'Obock', 'Dikhil', 'Arta', 'Holhol', 'Loyada', 'Balho', 'Galafi']) AS city_name;

-- EGYPT (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Egypt', 'EG', '🇪🇬', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Egypt') c,
UNNEST(ARRAY['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez', 'Luxor', 'Aswan', 'Mansoura', 'Tanta']) AS city_name;

-- EQUATORIAL GUINEA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Equatorial Guinea', 'GQ', '🇬🇶', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Equatorial Guinea') c,
UNNEST(ARRAY['Malabo', 'Bata', 'Ebebiyin', 'Aconibe', 'Añisoc', 'Luba', 'Evinayong', 'Mongomo', 'Mengomeyén', 'Rebola']) AS city_name;

-- ERITREA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Eritrea', 'ER', '🇪🇷', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Eritrea') c,
UNNEST(ARRAY['Asmara', 'Keren', 'Mendefera', 'Dekemhare', 'Teseney', 'Akurdat', 'Adi Ugri', 'Areza', 'Afabet', 'Assab']) AS city_name;

-- ESWATINI (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Eswatini', 'SZ', '🇸🇿', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Eswatini') c,
UNNEST(ARRAY['Mbabane', 'Manzini', 'Big Bend', 'Siteki', 'Pigg''s Peak', 'Bremersdorp', 'Matsapha', 'Ngwenya', 'Bhunya', 'Nhlangano']) AS city_name;

-- ETHIOPIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Ethiopia', 'ET', '🇪🇹', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Ethiopia') c,
UNNEST(ARRAY['Addis Ababa', 'Dire Dawa', 'Adama', 'Hawassa', 'Mek''ele', 'Bahir Dar', 'Dessie', 'Jima', 'Dilla', 'Durem']) AS city_name;

-- GABON (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Gabon', 'GA', '🇬🇦', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Gabon') c,
UNNEST(ARRAY['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Mouila', 'Lambaréné', 'Koulamoutou', 'Mitzic', 'Bitam', 'Akanda']) AS city_name;

-- GAMBIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Gambia', 'GM', '🇬🇲', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Gambia') c,
UNNEST(ARRAY['Banjul', 'Serekunda', 'Brikama', 'Lamin', 'Denton', 'Gunjur', 'Bakau', 'Kombo', 'Serrekund', 'Kaur']) AS city_name;

-- GHANA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Ghana', 'GH', '🇬🇭', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Ghana') c,
UNNEST(ARRAY['Accra', 'Kumasi', 'Tamale', 'Sekondi-Takoradi', 'Cape Coast', 'Tema', 'Obuasi', 'Sunyani', 'Koforidua', 'Tarkwa']) AS city_name;

-- GUINEA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Guinea', 'GN', '🇬🇳', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Guinea') c,
UNNEST(ARRAY['Conakry', 'Kindia', 'Mamou', 'Dabola', 'Gaoual', 'Youkounkoun', 'Macenta', 'Kankan', 'Kissidougou', 'Nzérékoré']) AS city_name;

-- GUINEA-BISSAU (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Guinea-Bissau', 'GW', '🇬🇼', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Guinea-Bissau') c,
UNNEST(ARRAY['Bissau', 'Bafatá', 'Gabú', 'Cacheu', 'Oio', 'Biombo', 'Bolama', 'Catió', 'Sonaco', 'Quebo']) AS city_name;

-- IVORY COAST (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Ivory Coast', 'CI', '🇨🇮', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Ivory Coast') c,
UNNEST(ARRAY['Abidjan', 'Yamoussoukro', 'Bouaké', 'Daloa', 'Korhogo', 'San-Pédro', 'Dimbokro', 'Gagnoa', 'Adzopé', 'Man']) AS city_name;

-- KENYA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Kenya', 'KE', '🇰🇪', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Kenya') c,
UNNEST(ARRAY['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kericho', 'Nyeri', 'Muranga', 'Machakos', 'Meru']) AS city_name;

-- LESOTHO (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Lesotho', 'LS', '🇱🇸', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Lesotho') c,
UNNEST(ARRAY['Maseru', 'Teyateyaneng', 'Mafeteng', 'Leribe', 'Butha-Buthe', 'Mokhotlong', 'Qacha''s Nek', 'Berea', 'Maputsoe', 'Peka']) AS city_name;

-- LIBERIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Liberia', 'LR', '🇱🇷', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Liberia') c,
UNNEST(ARRAY['Monrovia', 'Kakata', 'Paynesville', 'Todee', 'Gbanga', 'Buchanan', 'Greenville', 'Voinjama', 'Sanniquellie', 'Zwedru']) AS city_name;

-- LIBYA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Libya', 'LY', '🇱🇾', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Libya') c,
UNNEST(ARRAY['Tripoli', 'Benghazi', 'Misrata', 'Al Khums', 'Derna', 'Tobruk', 'Sabha', 'Sirte', 'Zliten', 'Tubruk']) AS city_name;

-- MADAGASCAR (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Madagascar', 'MG', '🇲🇬', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Madagascar') c,
UNNEST(ARRAY['Antananarivo', 'Antsirabe', 'Toliara', 'Mahajanga', 'Fianarantsoa', 'Sava', 'Sambava', 'Morondava', 'Soavinandriana', 'Manakara']) AS city_name;

-- MALAWI (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Malawi', 'MW', '🇲🇼', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Malawi') c,
UNNEST(ARRAY['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Kasungu', 'Mangochi', 'Liwonde', 'Salima', 'Nkhotakota', 'Dedza']) AS city_name;

-- MALI (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Mali', 'ML', '🇲🇱', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Mali') c,
UNNEST(ARRAY['Bamako', 'Ségou', 'Mopti', 'Kayes', 'Koulikoro', 'Sikasso', 'Gao', 'Kidal', 'Timbuktu', 'Niono']) AS city_name;

-- MAURITANIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Mauritania', 'MR', '🇲🇷', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Mauritania') c,
UNNEST(ARRAY['Nouakchott', 'Nouadhibou', 'Atar', 'Tidjikja', 'Kaédi', 'Néma', 'Rosso', 'Aïoun el Atrouss', 'Kiffa', 'Zouérat']) AS city_name;

-- MAURITIUS (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Mauritius', 'MU', '🇲🇺', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Mauritius') c,
UNNEST(ARRAY['Port Louis', 'Beau Bassin-Rose Hill', 'Vacoas-Phoenix', 'Curepipe', 'Quatre Bornes', 'Saint-Paul', 'Saint-Pierre', 'Goodlands', 'Mahébourg', 'Grand Baie']) AS city_name;

-- MOROCCO (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Morocco', 'MA', '🇲🇦', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Morocco') c,
UNNEST(ARRAY['Casablanca', 'Fes', 'Tangier', 'Marrakesh', 'Agadir', 'Meknes', 'Rabat', 'Safi', 'Oujda', 'El Jadida']) AS city_name;

-- MOZAMBIQUE (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Mozambique', 'MZ', '🇲🇿', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Mozambique') c,
UNNEST(ARRAY['Maputo', 'Matola', 'Beira', 'Nampula', 'Chimoio', 'Gaza', 'Quelimane', 'Inhambane', 'Xai-Xai', 'Lichinga']) AS city_name;

-- NAMIBIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Namibia', 'NA', '🇳🇦', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Namibia') c,
UNNEST(ARRAY['Windhoek', 'Walvis Bay', 'Swakopmund', 'Okahandja', 'Tsumeb', 'Outjo', 'Otjiwarongo', 'Ondangwa', 'Oshakati', 'Keetmanshoop']) AS city_name;

-- NIGER (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Niger', 'NE', '🇳🇪', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Niger') c,
UNNEST(ARRAY['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua', 'Dosso', 'Ilesha', 'Konni', 'Birni N''Konni', 'Arlit']) AS city_name;

-- RWANDA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Rwanda', 'RW', '🇷🇼', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Rwanda') c,
UNNEST(ARRAY['Kigali', 'Butare', 'Muhanga', 'Gitarama', 'Kibuye', 'Cyangugu', 'Gisenyi', 'Ruhengeri', 'Nyabihu', 'Karongi']) AS city_name;

-- SENEGAL (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Senegal', 'SN', '🇸🇳', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Senegal') c,
UNNEST(ARRAY['Dakar', 'Thiès', 'Kaolack', 'Tambacounda', 'Kolda', 'Saint-Louis', 'Ziguinchor', 'Louga', 'Matam', 'Diourbel']) AS city_name;

-- SIERRA LEONE (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Sierra Leone', 'SL', '🇸🇱', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Sierra Leone') c,
UNNEST(ARRAY['Freetown', 'Bo', 'Kenema', 'Makeni', 'Koidu', 'Lunsar', 'Kabala', 'Kamara', 'Port Loko', 'Calaba Town']) AS city_name;

-- SOMALIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Somalia', 'SO', '🇸🇴', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Somalia') c,
UNNEST(ARRAY['Mogadishu', 'Hargeisa', 'Kismayo', 'Baidoa', 'Galkacyo', 'Bosaso', 'Beledweyne', 'Jowhar', 'Afmadow', 'Kismayo']) AS city_name;

-- SOUTH AFRICA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'South Africa', 'ZA', '🇿🇦', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'South Africa') c,
UNNEST(ARRAY['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'Pietermaritzburg', 'East London', 'Soweto', 'Benoni']) AS city_name;

-- SOUTH SUDAN (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'South Sudan', 'SS', '🇸🇸', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'South Sudan') c,
UNNEST(ARRAY['Juba', 'Wau', 'Malakal', 'Kassala', 'Rumbek', 'Bentiu', 'Torit', 'Yambio', 'Kapoeta', 'Gogrial']) AS city_name;

-- SUDAN (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Sudan', 'SD', '🇸🇩', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Sudan') c,
UNNEST(ARRAY['Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'El Obeid', 'Nyala', 'Ed Dueim', 'Medani', 'Atbara', 'Gedaref']) AS city_name;

-- TANZANIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Tanzania', 'TZ', '🇹🇿', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Tanzania') c,
UNNEST(ARRAY['Dar es Salaam', 'Mwanza', 'Arusha', 'Mbeya', 'Dodoma', 'Iringa', 'Morogoro', 'Songea', 'Moshi', 'Kigoma']) AS city_name;

-- TOGO (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Togo', 'TG', '🇹🇬', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Togo') c,
UNNEST(ARRAY['Lomé', 'Sokodé', 'Atakpamé', 'Kpalimé', 'Tsévié', 'Aného', 'Dapaong', 'Notse', 'Vogan', 'Blitta']) AS city_name;

-- TUNISIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Tunisia', 'TN', '🇹🇳', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Tunisia') c,
UNNEST(ARRAY['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Gafsa', 'Tozeur', 'Tataouine', 'Sidi Bouzid', 'Médenine', 'Jendouba']) AS city_name;

-- UGANDA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Uganda', 'UG', '🇺🇬', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Uganda') c,
UNNEST(ARRAY['Kampala', 'Gulu', 'Lira', 'Jinja', 'Masaka', 'Mbarara', 'Fort Portal', 'Soroti', 'Kabale', 'Tororo']) AS city_name;

-- ZAMBIA (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Zambia', 'ZM', '🇿🇲', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Zambia') c,
UNNEST(ARRAY['Lusaka', 'Ndola', 'Kitwe', 'Kabwe', 'Chingola', 'Mufulira', 'Livingstone', 'Solwezi', 'Kafue', 'Chipata']) AS city_name;

-- ZIMBABWE (10 cities)
INSERT INTO "country" (id, name, code, flag, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Zimbabwe', 'ZW', '🇿🇼', NOW(), NOW());

INSERT INTO "city" (id, name, "countryId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), city_name, c.id, NOW(), NOW()
FROM (SELECT id FROM "country" WHERE name = 'Zimbabwe') c,
UNNEST(ARRAY['Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru', 'Kwekwe', 'Kadoma', 'Masvingo', 'Zvishavane', 'Chegutu']) AS city_name;

-- VERIFY SEEDING COMPLETE
SELECT 'countries' as table_name, COUNT(*) as row_count FROM "country"
UNION ALL
SELECT 'cities' as table_name, COUNT(*) as row_count FROM "city"
ORDER BY table_name;

-- Expected output:
-- table_name | row_count
-- cities     | 521
-- countries  | 54
