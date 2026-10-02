CREATE TABLE `credit_card_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`credit_card_id` text NOT NULL,
	`reference_month` text NOT NULL,
	`amount_cents` integer,
	FOREIGN KEY (`plan_id`) REFERENCES `financial_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`credit_card_id`) REFERENCES `credit_cards`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_credit_card_invoices_reference_month" CHECK("credit_card_invoices"."reference_month" glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uk_credit_card_invoices_plan_card_month` ON `credit_card_invoices` (`plan_id`,`credit_card_id`,`reference_month`);--> statement-breakpoint
CREATE INDEX `idx_credit_card_invoices_card` ON `credit_card_invoices` (`credit_card_id`);--> statement-breakpoint
CREATE TABLE `credit_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_credit_cards_user` ON `credit_cards` (`user_id`);--> statement-breakpoint
CREATE TABLE `financial_plan_partners` (
	`plan_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`plan_id`, `user_id`),
	FOREIGN KEY (`plan_id`) REFERENCES `financial_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_financial_plan_partners_user` ON `financial_plan_partners` (`user_id`);--> statement-breakpoint
CREATE TABLE `financial_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text,
	`active_invite_token` text,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `financial_plans_active_invite_token_unique` ON `financial_plans` (`active_invite_token`);--> statement-breakpoint
CREATE INDEX `idx_financial_plans_owner` ON `financial_plans` (`owner_id`);--> statement-breakpoint
CREATE TABLE `transaction_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_categories_name_unique` ON `transaction_categories` (`name`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`description` text,
	`amount_cents` integer NOT NULL,
	`type` text NOT NULL,
	`reference_date` text NOT NULL,
	`created_at` text NOT NULL,
	`category_id` text,
	`responsible_user_id` text,
	`recurring_group_id` text,
	`display_order` integer,
	`credit_card_invoice_id` text,
	`is_cleared_by_invoice` integer DEFAULT false NOT NULL,
	`due_date` text,
	`payment_date` text,
	`payment_status` text DEFAULT 'PENDING' NOT NULL,
	`billing_document_type` text,
	`billing_document_url` text,
	`billing_document_file_name` text,
	`billing_document_mime_type` text,
	`billing_document_storage_key` text,
	`billing_document_uploaded_at` text,
	FOREIGN KEY (`plan_id`) REFERENCES `financial_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `transaction_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`credit_card_invoice_id`) REFERENCES `credit_card_invoices`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_transactions_type" CHECK("transactions"."type" in ('REVENUE', 'EXPENSE')),
	CONSTRAINT "chk_transactions_payment_status" CHECK("transactions"."payment_status" in ('PENDING', 'PAID')),
	CONSTRAINT "chk_transactions_billing_document_type" CHECK("transactions"."billing_document_type" is null or "transactions"."billing_document_type" in ('LINK', 'FILE'))
);
--> statement-breakpoint
CREATE INDEX `idx_transactions_plan_reference_date` ON `transactions` (`plan_id`,`reference_date`);--> statement-breakpoint
CREATE INDEX `idx_transactions_invoice` ON `transactions` (`credit_card_invoice_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_category` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_recurring_group` ON `transactions` (`recurring_group_id`);--> statement-breakpoint
CREATE INDEX `idx_transactions_storage_key` ON `transactions` (`billing_document_storage_key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`name` text,
	`auth_provider` text DEFAULT 'LOCAL' NOT NULL,
	`google_subject` text,
	`email_verified` integer DEFAULT false NOT NULL,
	CONSTRAINT "chk_users_auth_provider" CHECK("users"."auth_provider" in ('LOCAL', 'GOOGLE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_subject_unique` ON `users` (`google_subject`);