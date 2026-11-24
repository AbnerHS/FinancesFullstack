ALTER TABLE `subscriptions` ADD `credit_card_id` text REFERENCES credit_cards(id) ON DELETE set null;
