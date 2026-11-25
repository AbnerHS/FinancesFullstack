CREATE TABLE `forecast_amounts` (
	`forecast_id` text NOT NULL,
	`from_month` text NOT NULL,
	`amount_cents` integer NOT NULL,
	PRIMARY KEY(`forecast_id`, `from_month`),
	FOREIGN KEY (`forecast_id`) REFERENCES `forecasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `forecasts` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`category_id` text NOT NULL,
	`responsible_user_id` text,
	`due_day` integer,
	`start_month` text NOT NULL,
	`end_month` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `financial_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `transaction_categories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_forecasts_due_day" CHECK("forecasts"."due_day" is null or "forecasts"."due_day" between 1 and 31)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uk_forecasts_plan_category` ON `forecasts` (`plan_id`,`category_id`);