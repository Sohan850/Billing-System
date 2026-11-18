-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 18, 2026 at 07:57 AM
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
-- Database: `billing`
--

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `customer_name`, `phone`, `email`, `created_at`) VALUES
(1, 'Rahul Kumar', '9876543211', 'rahulkumar@gmail.com', '2026-11-13 06:26:17'),
(5, 'Atharva kochi', '9876543214', 'kochi123@gmail.com', '2026-11-14 16:16:53'),
(6, 'Sohan Chopdekar', '9876543215', 'chopdekarsohan73@gmail.com', '2026-11-14 18:01:21');

-- --------------------------------------------------------

--
-- Table structure for table `memberships`
--

CREATE TABLE `memberships` (
  `membership_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `membership_type` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `memberships`
--

INSERT INTO `memberships` (`membership_id`, `customer_id`, `membership_type`, `start_date`, `end_date`, `status`) VALUES
(5, 5, 'Gold', '2026-11-15', '2026-11-16', 'Active'),
(6, 6, 'Platinum', '2026-11-18', '2026-11-19', 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `cost_price` decimal(10,2) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `product_name`, `sku`, `cost_price`, `selling_price`, `stock_quantity`, `created_at`) VALUES
(1, 'Rice 5kg', 'RICE001', 260.00, 325.00, 24, '2026-11-13 05:50:11'),
(7, 'Sugar1kg', 'SUGAR002', 45.00, 55.00, 14, '2026-11-13 08:57:50');

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `purchase_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `cost_price` decimal(10,2) NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `purchase_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchases`
--

INSERT INTO `purchases` (`purchase_id`, `product_id`, `user_id`, `quantity`, `cost_price`, `total_cost`, `purchase_date`) VALUES
(1, 1, 1, 15, 260.00, 3900.00, '2026-11-13 06:15:41'),
(2, 7, 1, 5, 45.00, 225.00, '2026-11-14 16:02:51'),
(3, 1, 1, 2, 260.00, 520.00, '2026-11-14 16:03:55'),
(4, 7, 1, 10, 45.00, 450.00, '2026-11-14 18:07:05'),
(5, 1, 1, 20, 260.00, 5200.00, '2026-11-14 19:59:54');

-- --------------------------------------------------------

--
-- Table structure for table `reward_coupons`
--

CREATE TABLE `reward_coupons` (
  `coupon_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `coupon_code` varchar(50) NOT NULL,
  `threshold_amount` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Available',
  `issued_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `redeemed_at` timestamp NULL DEFAULT NULL,
  `redeemed_sale_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reward_coupons`
--

INSERT INTO `reward_coupons` (`coupon_id`, `customer_id`, `coupon_code`, `threshold_amount`, `discount_amount`, `status`, `issued_at`, `redeemed_at`, `redeemed_sale_id`) VALUES
(1, 6, 'REWARD-98DFE576', 5000.00, 200.00, 'Available', '2026-11-14 19:57:04', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `sale_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `sale_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`sale_id`, `customer_id`, `user_id`, `total_amount`, `sale_date`, `discount_amount`) VALUES
(1, 1, 1, 640.00, '2026-11-13 07:05:31', 0.00),
(2, 1, 1, 650.00, '2026-11-13 07:56:53', 0.00),
(3, 1, 1, 1625.00, '2026-11-13 07:58:43', 0.00),
(4, NULL, 1, 650.00, '2026-11-13 08:54:25', 0.00),
(5, NULL, 1, 55.00, '2026-11-13 08:58:50', 0.00),
(6, 1, 1, 650.00, '2026-11-14 02:37:51', 0.00),
(7, NULL, 1, 650.00, '2026-11-14 09:46:11', 0.00),
(8, 1, 1, 110.00, '2026-11-14 17:59:59', 0.00),
(9, 5, 1, 110.00, '2026-11-14 18:03:41', 0.00),
(10, 1, 1, 55.00, '2026-11-14 18:04:24', 0.00),
(11, 5, 1, 617.50, '2026-11-14 19:16:59', 32.50),
(12, 6, 1, 5850.00, '2026-11-14 19:57:04', 650.00),
(13, 6, 3, 275.00, '2026-11-18 06:29:51', 0.00),
(14, 6, 3, 292.50, '2026-11-18 06:31:13', 32.50);

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `sale_item_id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sale_items`
--

INSERT INTO `sale_items` (`sale_item_id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `subtotal`) VALUES
(1, 1, 1, 2, 320.00, 640.00),
(2, 2, 1, 2, 325.00, 650.00),
(3, 3, 1, 5, 325.00, 1625.00),
(4, 4, 1, 2, 325.00, 650.00),
(5, 5, 7, 1, 55.00, 55.00),
(6, 6, 1, 2, 325.00, 650.00),
(7, 7, 1, 2, 325.00, 650.00),
(8, 8, 7, 2, 55.00, 110.00),
(9, 9, 7, 2, 55.00, 110.00),
(10, 10, 7, 1, 55.00, 55.00),
(11, 11, 1, 2, 325.00, 650.00),
(12, 12, 1, 20, 325.00, 6500.00),
(13, 13, 7, 5, 55.00, 275.00),
(14, 14, 1, 1, 325.00, 325.00);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `role` enum('admin','cashier') NOT NULL DEFAULT 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password`, `created_at`, `role`) VALUES
(1, 'admin', 'scrypt:32768:8:1$t2XjV2LTw8cMmDD7$1a7be75793f3b5044ced52f1d07949ccb10adc6eeab62afffaf4186ccf596355372d60225b197ed9ddcbf6c89322c86c35fb5458ab6c763a90874fc377da5257', '2026-11-13 05:31:46', 'admin'),
(3, 'Cashier1', 'scrypt:32768:8:1$5JU7qmfJnzMmRjRP$c093ec6e2ac6c9072da4c9c2f984ac1bbc9ed01e2d59a4e32baaeddae50b8807aa2f8d2902cc23dff5ee81d40dc535b75004e3a7b3e5ed6205e4255061d9489b', '2026-11-18 06:28:48', 'cashier');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- Indexes for table `memberships`
--
ALTER TABLE `memberships`
  ADD PRIMARY KEY (`membership_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `sku` (`sku`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`purchase_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reward_coupons`
--
ALTER TABLE `reward_coupons`
  ADD PRIMARY KEY (`coupon_id`),
  ADD UNIQUE KEY `coupon_code` (`coupon_code`),
  ADD UNIQUE KEY `customer_id` (`customer_id`,`threshold_amount`),
  ADD KEY `redeemed_sale_id` (`redeemed_sale_id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`sale_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`sale_item_id`),
  ADD KEY `sale_id` (`sale_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `memberships`
--
ALTER TABLE `memberships`
  MODIFY `membership_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `purchase_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `reward_coupons`
--
ALTER TABLE `reward_coupons`
  MODIFY `coupon_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `sale_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `sale_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `memberships`
--
ALTER TABLE `memberships`
  ADD CONSTRAINT `memberships_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`);

--
-- Constraints for table `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `purchases_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `reward_coupons`
--
ALTER TABLE `reward_coupons`
  ADD CONSTRAINT `reward_coupons_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `reward_coupons_ibfk_2` FOREIGN KEY (`redeemed_sale_id`) REFERENCES `sales` (`sale_id`);

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `sales_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`),
  ADD CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
