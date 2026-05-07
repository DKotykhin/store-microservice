CREATE TABLE `attribute_translation` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`attribute_id` varchar(36) NOT NULL,
	`language` varchar(10) NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `attribute_translation_id` PRIMARY KEY(`id`),
	CONSTRAINT `attribute_translation_unique` UNIQUE(`attribute_id`,`language`)
);
--> statement-breakpoint
CREATE TABLE `attribute` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`category_id` varchar(36) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `attribute_id` PRIMARY KEY(`id`),
	CONSTRAINT `attribute_category_slug_unique` UNIQUE(`category_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `category_translation` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`category_id` varchar(36) NOT NULL,
	`language` varchar(10) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` varchar(255),
	CONSTRAINT `category_translation_id` PRIMARY KEY(`id`),
	CONSTRAINT `category_translation_unique` UNIQUE(`category_id`,`language`)
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(255) NOT NULL,
	`is_available` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `category_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `image` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`url` varchar(255) NOT NULL,
	`alt` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`item_id` varchar(36) NOT NULL,
	CONSTRAINT `image_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_attribute_translation` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`item_attribute_id` varchar(36) NOT NULL,
	`language` varchar(10) NOT NULL,
	`value` varchar(255) NOT NULL,
	CONSTRAINT `item_attribute_translation_id` PRIMARY KEY(`id`),
	CONSTRAINT `item_attribute_translation_unique` UNIQUE(`item_attribute_id`,`language`)
);
--> statement-breakpoint
CREATE TABLE `item_attribute` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`item_id` varchar(36) NOT NULL,
	`attribute_id` varchar(36) NOT NULL,
	`quantity` int,
	CONSTRAINT `item_attribute_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_price` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`item_id` varchar(36) NOT NULL,
	`item_attribute_id` varchar(36),
	`price_type` varchar(50) NOT NULL DEFAULT 'regular',
	`value` decimal(10,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'UAH',
	CONSTRAINT `item_price_id` PRIMARY KEY(`id`),
	CONSTRAINT `type_item_attr_unique` UNIQUE(`item_id`,`price_type`,`item_attribute_id`)
);
--> statement-breakpoint
CREATE TABLE `item_translation` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`item_id` varchar(36) NOT NULL,
	`language` varchar(10) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` varchar(255),
	`detailed_description` text,
	CONSTRAINT `item_translation_id` PRIMARY KEY(`id`),
	CONSTRAINT `item_translation_unique` UNIQUE(`item_id`,`language`)
);
--> statement-breakpoint
CREATE TABLE `item` (
	`id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(255) NOT NULL,
	`brand` varchar(255),
	`is_available` boolean NOT NULL DEFAULT true,
	`expected_date` date,
	`sort_order` int NOT NULL DEFAULT 0,
	`quantity` int,
	`category_id` varchar(36) NOT NULL,
	CONSTRAINT `item_id` PRIMARY KEY(`id`),
	CONSTRAINT `item_category_slug_unique` UNIQUE(`category_id`,`slug`)
);
--> statement-breakpoint
ALTER TABLE `attribute_translation` ADD CONSTRAINT `attribute_translation_attribute_id_attribute_id_fk` FOREIGN KEY (`attribute_id`) REFERENCES `attribute`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attribute` ADD CONSTRAINT `attribute_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_translation` ADD CONSTRAINT `category_translation_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `image` ADD CONSTRAINT `image_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_attribute_translation` ADD CONSTRAINT `item_attr_trans_item_attr_id_fk` FOREIGN KEY (`item_attribute_id`) REFERENCES `item_attribute`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_attribute` ADD CONSTRAINT `item_attr_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_attribute` ADD CONSTRAINT `item_attr_attr_id_fk` FOREIGN KEY (`attribute_id`) REFERENCES `attribute`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_price` ADD CONSTRAINT `item_price_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_price` ADD CONSTRAINT `item_price_item_attr_id_fk` FOREIGN KEY (`item_attribute_id`) REFERENCES `item_attribute`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_translation` ADD CONSTRAINT `item_translation_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item` ADD CONSTRAINT `item_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE cascade ON UPDATE no action;