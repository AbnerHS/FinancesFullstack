CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`name` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`category_id` text,
	`responsible_user_id` text,
	`billing_day` integer NOT NULL,
	`charge_mode` text NOT NULL,
	`start_month` text NOT NULL,
	`end_month` text,
	`generated_through` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `financial_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `transaction_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_subscriptions_billing_day" CHECK("subscriptions"."billing_day" between 1 and 31),
	CONSTRAINT "chk_subscriptions_charge_mode" CHECK("subscriptions"."charge_mode" in ('BILL', 'AUTO'))
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_plan` ON `subscriptions` (`plan_id`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `subscription_id` text REFERENCES subscriptions(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `transactions` ADD `subscription_month` text;--> statement-breakpoint
CREATE UNIQUE INDEX `uk_transactions_subscription_month` ON `transactions` (`subscription_id`,`subscription_month`);