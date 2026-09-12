CREATE TABLE `lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`instructor_id` text NOT NULL,
	`vehicle` text,
	`kind` text DEFAULT 'practice' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`notes` text,
	`google_event_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
