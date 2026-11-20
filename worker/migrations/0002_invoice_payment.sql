ALTER TABLE `credit_card_invoices` ADD `due_date` text;--> statement-breakpoint
ALTER TABLE `credit_card_invoices` ADD `payment_status` text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE `credit_card_invoices` ADD `payment_date` text;