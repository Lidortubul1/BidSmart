-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 04, 2025 at 12:02 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bidsmart`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`) VALUES
(1, 'אלקטרוניקה'),
(3, 'ריהוט'),
(4, 'ספורט'),
(5, 'משחקים'),
(6, 'אחר'),
(7, 'מוצרים לבית'),
(8, 'פרטי אספנות'),
(9, 'לבוש');

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `subject` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `status` enum('new','in_progress','resolved') DEFAULT 'new',
  `admin_reply` text DEFAULT NULL,
  `reply_sent` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `is_admin_message` tinyint(1) DEFAULT 0,
  `sender_role` enum('user','admin') DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `contact_messages`
--

INSERT INTO `contact_messages` (`id`, `user_id`, `first_name`, `last_name`, `email`, `subject`, `message`, `status`, `admin_reply`, `reply_sent`, `created_at`, `is_admin_message`, `sender_role`) VALUES
(16, 14, 'lidor', 'tubul', 'tubul65431@gmail.com', 'בעיה בתשלום', 'שלום, ניסיתי לשלם עבור מוצר אבל זה נכשל לי', 'resolved', 'נא לפנות לחברת האשראי', 1, '2025-08-01 13:57:48', 0, 'user'),
(41, 14, NULL, NULL, 'tubul65431@gmail.com', 'בדיקה 1', 'בדיקה 1_2', 'resolved', '', 1, '2025-08-02 13:22:44', 1, 'admin'),
(43, 8, NULL, NULL, 'mori123@gmail.com', 'בדיקה 3', 'בדיקה 1_3', 'new', '', 0, '2025-08-02 13:25:19', 1, 'admin'),
(45, NULL, NULL, NULL, 'lidortubul7@gmail.com', 'בדיקה 11', 'בדיקה 11 11', 'resolved', '', 1, '2025-08-02 13:39:21', 1, 'admin'),
(46, 8, 'מורי', 'ווסרמן', 'mori123@gmail.com', 'האם מוצר תקין', 'האם ניתן לעלות מכרז על רכב?', 'in_progress', 'לא לא ניתן', 1, '2025-08-02 13:48:44', 0, 'user'),
(47, 14, NULL, NULL, 'tubul65431@gmail.com', 'בדיקה 123456', '1234567712345', 'resolved', '', 1, '2025-08-02 14:57:39', 1, 'admin');

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_live` tinyint(1) DEFAULT 0,
  `current_price` decimal(10,2) DEFAULT 0.00,
  `last_bid_time` datetime DEFAULT NULL,
  `winner_id_number` varchar(20) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `description` text DEFAULT NULL,
  `seller_id_number` varchar(20) NOT NULL,
  `product_status` enum('for sale','sale') NOT NULL,
  `start_time` time DEFAULT NULL,
  `second_place_id` varchar(20) DEFAULT NULL,
  `third_place_id` varchar(20) DEFAULT NULL,
  `bid_increment` int(11) NOT NULL DEFAULT 10,
  `category_id` int(11) NOT NULL,
  `subcategory_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`product_id`, `product_name`, `start_date`, `end_date`, `is_live`, `current_price`, `last_bid_time`, `winner_id_number`, `price`, `description`, `seller_id_number`, `product_status`, `start_time`, `second_place_id`, `third_place_id`, `bid_increment`, `category_id`, `subcategory_id`) VALUES
(37, 'אייפון 16 פרו מקס', '2026-03-01', '2027-03-11', 0, 4500.00, NULL, NULL, 4500.00, '16 פרו מקס', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 1, 25),
(38, ' BYD אטו 3', '2026-03-11', '2027-03-11', 0, 250000.00, NULL, NULL, 250000.00, 'רכב חשמלי BYD ', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 9, 27),
(39, 'אופניים חשמליים', '2025-07-24', '2027-03-11', 1, 3520.00, '2025-07-17 14:05:26', NULL, 3520.00, 'אופניים חשמליים במצב חדש למכירה ', '208083469', 'for sale', '10:00:00', NULL, NULL, 10, 4, 9),
(40, 'מחשב נייד', '2025-06-11', '2027-03-11', 1, 5100.00, '2025-07-24 12:34:03', '201234234', 5020.00, 'מחשב נייד גיימינג Lenovo IdeaPad LOQ 15.6\" FHD 144Hz i7-13650HX/16GB/512GB NVME/NVIDIA® GeForce RTX™ 4050 6GB/WIN 11 HOME/3Y 83DV00CKIV', '208083469', 'sale', '08:00:00', '208083469', NULL, 10, 1, 33),
(42, 'מיקסר חשמלי', '2025-07-24', '2027-03-11', 1, 3080.00, '2025-07-24 12:38:10', '201234234', 3020.00, 'מיקסר חשמלי למטבח', '208083469', 'sale', '10:00:00', '208083469', NULL, 10, 6, 13),
(43, ' ספה מודולרית מבד אריג רחיץ דוחה כתמים דגם פלאנט', '2026-03-31', '2027-03-11', 0, 6000.00, NULL, NULL, 6000.00, 'ספה מודולרית דגם פלאנט היא פתרון מושלם עבור מי שמעוניין בנוחות, גמישות ועיצוב מודרני. הספה מאפשרת לכם למקם את צד השזלונג באיזה צד שתרצו, והמעבר מתבצע בקלות רבה, הודות להחלפת הכריות וההדום.\r\n\r\nהבסיס עשוי מעץ מלא וחזק, מה שמבטיח יציבות ועמידות לאורך זמן. רגלי הספה עשויות PVC יצוק קשיח, העמידות לנזקי מים ומגנות על הרצפה מפני שריטות.', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 3, 7),
(44, 'ספה פינתית 300 ס\"מ ימין בד כחול ג\'ינס דגם בוקסי', '2026-03-11', '2027-03-11', 0, 4000.00, NULL, NULL, 4000.00, 'ספה פינתית דגם בוקסי מעוצבת בקו רך ונקי בעלת מסעדי ידיים רחבים שלא תרצו לקום ממנה.\r\nגוף הספה בנוי מעץ אורן מלא מהוקצע בשילוב רצועות גומי אלסטיות וגמישות בצורת שתי וערב לתמיכה מלאה למושבים. הספה מיוצרת בישראל. ריפוד נעים למגע בגוון כחול הנותן לספה מראה יוקרתי ועשיר.', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 3, 7),
(45, 'קרייזלר ראם מודל 2021', '2026-03-11', '2027-03-11', 0, 60000.00, NULL, NULL, 60000.00, '\r\n195,960 ק\"מ, יד נוכחית: ראשונה, בעלות נוכחית: חברה בע\"מ. תיבת הילוכים: אוטומטי צבע: שחור, מנוע: דיזל, נפח מנוע: 6,690 סמ\"ק, הנעה: 4x4, תוספות: ראה פירוט ברישיון, מפתח: יש.', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 6, 13),
(47, 'מכשיר סודהסטרים', '2026-03-11', '2027-03-11', 0, 2000.00, NULL, NULL, 2000.00, 'מתאים להגזה בבקבוקי סודהסטרים הבאים: בקבוק 1 ליטר - כמות מים להגזה עד קו המילוי כ-0.84 ליטר | בקבוק 0.5 ליטר - כמות מים להגזה עד קו מילוי 0.45 ליטר', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 3, 14),
(48, 'ג\'קוזי', '2026-03-11', '2027-03-11', 0, 7000.00, NULL, NULL, 7000.00, '-480\r\nמידות: 239 ס\"מ אורך, 239 ס\"מ רוחב, 99-112 ס\"מ גובה | מתאים ל- 6 אנשים.', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 3, 14),
(49, 'גלאקסי S20', '2026-03-11', '2027-03-11', 0, 1000.00, NULL, NULL, 1000.00, 'גלאקסי כמו חדש', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 1, 25),
(51, 'מחשב', '2026-03-11', '2027-03-11', 0, 4000.00, NULL, NULL, 4000.00, 'מחשב חדש', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 1, 33),
(53, 'אייפון 14 פרו מקס', '2026-03-11', '2027-03-11', 0, 3000.00, NULL, NULL, 3000.00, 'אייפון 14 חדש', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 1, 19),
(54, 'מיקסר חשמלי', '2026-03-11', '2027-03-11', 0, 1500.00, NULL, NULL, 1500.00, 'מיקסר חשמלי חדש', '208083469', 'for sale', '14:00:00', NULL, NULL, 10, 3, 14),
(58, 'קונסולה Sony PlayStation 5 Slim', '2026-03-11', '2027-03-11', 0, 2899.99, '2025-07-18 18:57:13', NULL, 2899.99, 'עם PS5 במהדורה דיגיטאלית, השחקנים מקבלים טכנולוגיית משחק עוצמתית, בתוך קונסולה חדשה SLIM בעיצוב קומפקטי ואלגנטי.\r\nשמרו את המשחקים האהובים עליכם מוכנים לשליפה עם כונן אחסון SSD בנפח 1TB מובנה.\r\nהתנסו בטעינה במהירות האור עם כונן SSD אולטרה-מהיר, תחושת אפיפות, משחקיות עמוקה יותר, בקר משחק אלחוטי DualSense‎ עם תמיכה במשוב הפטי, הדקים אדפטיביים ושמע תלת מימד, וכן בדור חדש לחלוטין של משחקי PlayStation מדהימים.', '208083469', 'for sale', '20:50:00', NULL, NULL, 100, 5, 12),
(59, 'samsung TV', '2025-07-30', '2025-07-31', 1, 2400.00, NULL, NULL, 2400.00, 'טלוויזיה SAMSUNG סמסונג 65\" 4K דגם UE65DU7100 /7000 *אחריות ע\"י היבואן*', '208083469', 'for sale', '11:50:00', NULL, NULL, 50, 1, 32);

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `image_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_images`
--

INSERT INTO `product_images` (`image_id`, `product_id`, `image_url`) VALUES
(1, 37, '/uploads/1749109032896_1fe03af6baeab695857e37209ce97117.webp'),
(2, 37, '/uploads/1749109032898_9831af1b0fa7bb4ed0dd83ebbe465771.webp'),
(3, 37, '/uploads/1749109032898_16740352ef9e87889dee6621d96a5ee7.webp'),
(4, 37, '/uploads/1749109032898_a75b43c4d5506c80a53b144d9ef6155c.webp'),
(5, 38, '/uploads/1749110193499_1-17-1024x611 (1).jpeg'),
(6, 38, '/uploads/1749110193522_1-17-1024x611.jpeg'),
(7, 38, '/uploads/1749110193522_2-110-1024x683 (1).jpg'),
(8, 38, '/uploads/1749110193523_2-110-1024x683.jpg'),
(9, 38, '/uploads/1749110193527_3-17-1024x683.jpeg'),
(10, 39, '/uploads/1749110311359_images (1).jfif'),
(11, 39, '/uploads/1749110311359_images.jfif'),
(12, 39, '/uploads/1749110311359_×¡×××§×-×¤××§×¡×-×××.jpg'),
(13, 40, '/uploads/1749110390114_83DV00CKIV_30042024094614_large.jpg'),
(14, 40, '/uploads/1749110390122_83DV00CKIV_30042024094618_large.jpg'),
(15, 40, '/uploads/1749110390123_83DV00CKIV_30042024094642_large.jpg'),
(16, 40, '/uploads/1749110390123_83DV00CKIV_30042024094717_large.jpg'),
(17, 42, '/uploads/1749110523202_Electra_1.avif'),
(18, 42, '/uploads/1749110523202_images (2).jfif'),
(19, 42, '/uploads/1749110523202_images (3).jfif'),
(21, 43, '/uploads/1749110657044_DSC0917-scaled.jpg'),
(22, 43, '/uploads/1749110657049_×¡×¤×-×¤××× ×-1.jpg'),
(23, 44, '/uploads/1749111338104_DSC0902-scaled.jpg'),
(24, 44, '/uploads/1749111338125_DSC0917-scaled.jpg'),
(26, 45, '/uploads/1749111483455_002.jpg'),
(27, 45, '/uploads/1749111483458_003.jpg'),
(28, 45, '/uploads/1749111483478_a_ignore_q_80_w_1000_c_limit_001.jpg'),
(29, 47, '/uploads/1749376486139_13815_ART_black_masterPack-20250406-092109_1.webp'),
(30, 47, '/uploads/1749376486140_Art_Life_1_1_3.webp'),
(31, 47, '/uploads/1749376486141_Art_Life_2_3.webp'),
(32, 48, '/uploads/1749377193101_SPA_J-480_2-800x533.jpg'),
(33, 48, '/uploads/1749377193101_SPA_J-480_3-800x532.jpg'),
(34, 48, '/uploads/1749377193102_SPA_J-480_5-800x532.jpg'),
(35, 49, '/uploads/1750087341629_×××¨××.webp'),
(37, 51, '/uploads/1750347508758_83DV00CKIV_30042024094618_large.jpg'),
(38, 53, '/uploads/1750354691258_9831af1b0fa7bb4ed0dd83ebbe465771.webp'),
(39, 54, '/uploads/1750405576968_Electra_1.avif'),
(46, 58, '/uploads/1752853800273_p1.jpg'),
(47, 58, '/uploads/1752853800277_P2.jpg'),
(48, 58, '/uploads/1752853800277_P3.jpg'),
(50, 59, '/uploads/1753275011451_TV2.jpg'),
(52, 59, '/uploads/1753693214677_TV3.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `quotation`
--

CREATE TABLE `quotation` (
  `quotation_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `buyer_id_number` varchar(20) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_delivered` tinyint(1) NOT NULL DEFAULT 0,
  `bid_time` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quotation`
--

INSERT INTO `quotation` (`quotation_id`, `product_id`, `buyer_id_number`, `price`, `is_delivered`, `bid_time`) VALUES
(199, 39, '201234234', 0.00, 0, '2025-07-24 12:32:04'),
(200, 40, '201234234', 5100.00, 0, '2025-07-24 12:34:03'),
(201, 42, '201234234', 3080.00, 0, '2025-07-24 12:38:10'),
(202, 40, '208083469', 5090.00, 0, '2025-07-24 12:34:01'),
(203, 42, '208083469', 3070.00, 0, '2025-07-24 12:38:08');

-- --------------------------------------------------------

--
-- Table structure for table `sale`
--

CREATE TABLE `sale` (
  `sale_id` int(11) NOT NULL,
  `end_date` date NOT NULL,
  `final_price` decimal(10,2) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `product_id` int(11) NOT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `is_delivered` tinyint(1) NOT NULL DEFAULT 0,
  `buyer_id_number` varchar(20) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `zip` varchar(10) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `street` varchar(100) DEFAULT NULL,
  `house_number` varchar(10) DEFAULT NULL,
  `apartment_number` varchar(10) DEFAULT NULL,
  `notes` varchar(200) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `delivery_method` enum('delivery','pickup') NOT NULL,
  `sent` enum('yes','no') DEFAULT 'no'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sale`
--

INSERT INTO `sale` (`sale_id`, `end_date`, `final_price`, `product_name`, `product_id`, `rating`, `is_delivered`, `buyer_id_number`, `country`, `zip`, `city`, `street`, `house_number`, `apartment_number`, `notes`, `phone`, `delivery_method`, `sent`) VALUES
(74, '0000-00-00', 0.00, 'מחשב נייד', 40, NULL, 1, '201234234', 'ישראל', '2343223', 'קרית אתא ', 'לילינבלום', '10', '13', 'להתקשר לפני שמגיע ', NULL, 'delivery', 'yes'),
(75, '0000-00-00', 0.00, 'מיקסר חשמלי', 42, NULL, 0, '201234234', 'ישראל', '2343223', 'קרית אתא ', 'לילינבלום', '10', '13', 'להתקשר לפני שמגיע 3', NULL, 'delivery', 'no');

-- --------------------------------------------------------

--
-- Table structure for table `subcategories`
--

CREATE TABLE `subcategories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subcategories`
--

INSERT INTO `subcategories` (`id`, `name`, `category_id`) VALUES
(7, 'סלון', 3),
(8, 'חדר שינה', 3),
(9, 'כושר', 4),
(10, 'מחנאות', 4),
(12, 'משחקי מחשב', 5),
(13, 'כללי', 6),
(14, 'כללי', 3),
(15, 'למטבח', 7),
(16, 'לסלון', 7),
(19, 'אחר', 1),
(21, 'אחר', 3),
(22, 'אחר', 4),
(23, 'אחר', 5),
(24, 'אחר', 7),
(25, 'טלפונים', 1),
(26, 'אחר', 8),
(27, 'אחר', 9),
(28, 'בגדי נשים', 9),
(32, 'טלוויזיות', 1),
(33, 'מחשבים', 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `id_number` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `role` enum('buyer','seller','admin') DEFAULT 'buyer',
  `id_card_photo` text DEFAULT NULL,
  `rating` double DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `zip` varchar(10) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `street` varchar(100) DEFAULT NULL,
  `house_number` varchar(10) DEFAULT NULL,
  `apartment_number` varchar(10) DEFAULT NULL,
  `profile_photo` text DEFAULT NULL,
  `status` enum('active','blocked') DEFAULT 'active',
  `registered` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `id_number`, `password`, `first_name`, `last_name`, `phone`, `role`, `id_card_photo`, `rating`, `country`, `zip`, `city`, `street`, `house_number`, `apartment_number`, `profile_photo`, `status`, `registered`) VALUES
(1, 'Lian.va.1995@gmail.com', '205960495', '$2b$10$vM4y2yqsbNpDCOpifcxVOOdjiZQ2clgPjUo79JNq7q.WbhiyqVjoG', 'לילי', 'ויינר', '+9724532345', 'seller', '1747765765446_WhatsApp Image 2024-11-24 at 14.33.04_400065d0.jpg', 3.3, NULL, '12345', 'כפר ביאליק', 'מיכאל', '19', '1', '1747765765448_WhatsApp Image 2024-11-24 at 14.33.04_400065d0.jpg', 'active', '2025-07-22 14:11:25'),
(2, 'lian1234@gmail.com', NULL, '$2b$10$myL4S9/D4CMEZuozUfIWVuZE8fV61BU64qlqzpQg8H8UdZVbeUnHC', 'ליאן', 'וינר', '', 'buyer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-07-22 14:11:25'),
(3, 'liel1234@gmail.com', NULL, '$2b$10$T16Hz6UFdVKyust2Xk9gSekBOtQBZVpeo.JyVd8Jn9mhq/ls9tg4.', 'ליאל', 'טובול', '', 'buyer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'blocked', '2025-07-22 14:11:25'),
(6, 'loren123@gmail.com', '208067956', '$2b$10$xLwg0qEjUKAqaBI4JxmQ1.jiUTzHqKj8V3QeC.pTQklVPQujSR9sy', 'loren', 'taboll', '+972525353456', 'seller', NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, '', 'active', '2025-07-22 14:11:25'),
(7, 'mai123@gmail.com', '204534565', '$2b$10$qg5A8hEYm.pW8ELHx12GZ.GZ7rtxgAcYuAUN6tL0OVlQtSBJvKjLu', 'מאי', 'גלילי', '', 'seller', 'ba35640a50358462e9ee62b892f27a8d', NULL, 'ישראל', '12345', 'כפר ביאליק', 'מיכאל', '19', '1', NULL, 'active', '2025-07-22 14:11:25'),
(8, 'mori123@gmail.com', '12345423', '$2b$10$hZ8VAx3Q1.I2ObfPvTZ2HeemaPPtNujiQOe6DLQqFNhWqCms3Q/lG', 'מורי', 'וסרמן', '0525353869', 'seller', '1750613043307_1-17-1024x611 (1).jpeg', 4.2, NULL, NULL, NULL, NULL, NULL, NULL, '', 'active', '2025-07-22 14:11:25'),
(9, 'niv12345@gmail.com', '12345232', '$2b$10$w598euryn2F33blL.UhcK.Bec1Qk98ZvWvDtACu/b527LKEZO22.O', 'niv', 'bra', '', 'buyer', '1750594498421__339410_11__1_1.jpg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-07-22 14:11:25'),
(10, 'ofir123@gmail.com', NULL, '$2b$10$qlKMaopQZ1ehg8GIXeyw/e7rGPBVNnGLMbpTemn7xP8bycG5iIwQG', 'אופיר', 'יצחק', '', 'buyer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-07-22 14:11:25'),
(11, 'orel123@gmail.com', NULL, '$2b$10$1PxDyDcqFTkz1TpskTajYOvSmWDeSi90V4PUK8QKp3oytVjGyoKfW', 'orel', 'hadad', '', 'buyer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-08-01 14:11:25'),
(12, 'rivka123@gmail.com', NULL, '$2b$10$hSqMMG/UP0CHYbg0lpL3p.GDcsiKYJdxWUtdEZGGT5ofJ9l1L.nua', 'rivka', 'amar', '', 'buyer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-07-22 14:11:25'),
(13, 'roei123@gmail.com', '234545342', '$2b$10$O3B.Y4745Wh582gpDSLaM.BVAJOhq/8HgTG1hn25CEZeZ4LkeuB/O', 'roei', 'gruber', '', 'buyer', '1749375562006_1-17-1024x611 (1).jpeg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-07-22 14:11:25'),
(14, 'tubul65431@gmail.com', '208083469', '$2b$10$kABMWX7xS5PJkZStU6byuO2gEsWZMPiu1HYXMcAc4bphfXzzm0ULK', 'לידור', 'טובול', '+972525353869', 'seller', '1750346749045_16740352ef9e87889dee6621d96a5ee7.webp', NULL, 'ישראל', '234544', 'שלומי ', 'חורשת האקליפטוס', '213', '213', NULL, 'blocked', '2025-07-22 14:11:25'),
(15, 'yael123@gmail.com', '123456789', '$2b$10$lo7C.yteGNZoOjmmaBgiouPGOwQwf7MnnjjvBLmIACm1ufHMvIhlq', 'yael', 'golan', '', 'admin', '1750612570903_1-17-1024x611 (1).jpeg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-07-22 14:11:25'),
(16, 'yarin123@gmail.com', NULL, '$2b$10$NvAHIXpj7gIl/ue/NLO2zuxG6y5hwoy19/BxOCtCL4KvzQXs0Qeda', 'ירין', 'זקס', '', 'buyer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-07-22 14:11:25'),
(17, 'nor@segev-net.co.il', '201234234', '$2b$10$JXojIHpM6FyvwdC2HDM2VeBnWQWhraneS0Ba2VZsfjWUBTi7liE4i', 'ניב', 'בראונשטיין', '', 'seller', '1753349183088_BidSmartLogo.jpg', NULL, NULL, '2343223', 'קרית אתא ', 'לילינבלום', '10', '13', NULL, 'blocked', '2025-07-24 12:26:06');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user` (`user_id`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `seller_id_number` (`seller_id_number`),
  ADD KEY `fk_category_id` (`category_id`),
  ADD KEY `fk_subcategory_id` (`subcategory_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `quotation`
--
ALTER TABLE `quotation`
  ADD PRIMARY KEY (`quotation_id`),
  ADD UNIQUE KEY `product_id_2` (`product_id`,`buyer_id_number`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `buyer_id_number` (`buyer_id_number`);

--
-- Indexes for table `sale`
--
ALTER TABLE `sale`
  ADD PRIMARY KEY (`sale_id`),
  ADD UNIQUE KEY `product_id` (`product_id`);

--
-- Indexes for table `subcategories`
--
ALTER TABLE `subcategories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `id_number` (`id_number`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `quotation`
--
ALTER TABLE `quotation`
  MODIFY `quotation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=204;

--
-- AUTO_INCREMENT for table `sale`
--
ALTER TABLE `sale`
  MODIFY `sale_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `subcategories`
--
ALTER TABLE `subcategories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `fk_category_id` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `fk_subcategory_id` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`),
  ADD CONSTRAINT `product_ibfk_1` FOREIGN KEY (`seller_id_number`) REFERENCES `users` (`id_number`);

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `quotation`
--
ALTER TABLE `quotation`
  ADD CONSTRAINT `quotation_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  ADD CONSTRAINT `quotation_ibfk_2` FOREIGN KEY (`buyer_id_number`) REFERENCES `users` (`id_number`) ON UPDATE CASCADE;

--
-- Constraints for table `sale`
--
ALTER TABLE `sale`
  ADD CONSTRAINT `sale_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`);

--
-- Constraints for table `subcategories`
--
ALTER TABLE `subcategories`
  ADD CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
