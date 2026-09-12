CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`actor_member_id` text,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`meta_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `audit_school_time_idx` ON `audit_event` (`school_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `enrollment` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`package_id` text,
	`driving_minutes` integer NOT NULL,
	`parking_sessions` integer NOT NULL,
	`theory_minutes` integer NOT NULL,
	`exam_drive_attempts` integer NOT NULL,
	`exam_parking_attempts` integer NOT NULL,
	`price_millimes` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`package_id`) REFERENCES `package`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`school_id`,`student_id`) REFERENCES `student_profile`(`school_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `enrollment_student_idx` ON `enrollment` (`school_id`,`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_school_key` ON `enrollment` (`school_id`,`id`);--> statement-breakpoint
CREATE TABLE `exam` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`type` text NOT NULL,
	`scheduled_for` integer NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`result_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`school_id`,`student_id`) REFERENCES `student_profile`(`school_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exam_student_idx` ON `exam` (`school_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `instructor_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text,
	`hire_date` integer,
	`active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instructor_school_user_key` ON `instructor_profile` (`school_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `instructor_school_key` ON `instructor_profile` (`school_id`,`id`);--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`student_id` text NOT NULL,
	`instructor_id` text NOT NULL,
	`vehicle_id` text,
	`kind` text DEFAULT 'driving' NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`notes` text,
	`created_by_member_id` text,
	`google_event_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`school_id`,`student_id`) REFERENCES `student_profile`(`school_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`school_id`,`instructor_id`) REFERENCES `instructor_profile`(`school_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`school_id`,`vehicle_id`) REFERENCES `vehicle`(`school_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lesson_school_start_idx` ON `lesson` (`school_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `lesson_school_status_idx` ON `lesson` (`school_id`,`status`);--> statement-breakpoint
CREATE INDEX `lesson_instructor_idx` ON `lesson` (`school_id`,`instructor_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`kind` text NOT NULL,
	`recipient_member_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_for` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`sent_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `outbox_due_idx` ON `notification_outbox` (`status`,`scheduled_for`);--> statement-breakpoint
CREATE TABLE `package` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`driving_minutes` integer DEFAULT 0 NOT NULL,
	`parking_sessions` integer DEFAULT 0 NOT NULL,
	`theory_minutes` integer DEFAULT 0 NOT NULL,
	`exam_drive_attempts` integer DEFAULT 0 NOT NULL,
	`exam_parking_attempts` integer DEFAULT 0 NOT NULL,
	`price_millimes` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `package_school_active_idx` ON `package` (`school_id`,`active`);--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`enrollment_id` text NOT NULL,
	`amount_millimes` integer NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`received_by_member_id` text,
	`note` text,
	`voided_at` integer,
	`void_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`school_id`,`enrollment_id`) REFERENCES `enrollment`(`school_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_enrollment_idx` ON `payment` (`school_id`,`enrollment_id`);--> statement-breakpoint
CREATE TABLE `school` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`phone` text,
	`address` text,
	`city` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_slug_unique` ON `school` (`slug`);--> statement-breakpoint
CREATE TABLE `school_member` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`invited_by_member_id` text,
	`joined_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_member_user_id_unique` ON `school_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `member_school_role_idx` ON `school_member` (`school_id`,`role`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `student_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`user_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text,
	`date_of_birth` integer,
	`license_category` text DEFAULT 'B' NOT NULL,
	`enrollment_date` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`assigned_instructor_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`school_id`,`assigned_instructor_id`) REFERENCES `instructor_profile`(`school_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `student_school_status_idx` ON `student_profile` (`school_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `student_school_user_key` ON `student_profile` (`school_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `student_school_key` ON `student_profile` (`school_id`,`id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`ban_expires` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `vehicle` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`plate` text,
	`category` text DEFAULT 'B' NOT NULL,
	`transmission` text DEFAULT 'manual' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `school`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `vehicle_school_active_idx` ON `vehicle` (`school_id`,`active`);--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_school_key` ON `vehicle` (`school_id`,`id`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TRIGGER `lesson_no_overlap_insert` BEFORE INSERT ON `lesson`
BEGIN
	SELECT RAISE(ABORT, 'LESSON_OVERLAP')
	WHERE NEW.`status` NOT IN ('cancelled', 'no_show')
		AND EXISTS (
			SELECT 1 FROM `lesson`
			WHERE `school_id` = NEW.`school_id`
				AND `id` != NEW.`id`
				AND `status` NOT IN ('cancelled')
				AND `ends_at` > NEW.`starts_at` AND `starts_at` < NEW.`ends_at`
				AND (
					`instructor_id` = NEW.`instructor_id`
					OR (`vehicle_id` IS NOT NULL AND NEW.`vehicle_id` IS NOT NULL AND `vehicle_id` = NEW.`vehicle_id`)
				)
		);
END;
--> statement-breakpoint
CREATE TRIGGER `lesson_no_overlap_update` BEFORE UPDATE ON `lesson`
BEGIN
	SELECT RAISE(ABORT, 'LESSON_OVERLAP')
	WHERE NEW.`status` NOT IN ('cancelled', 'no_show')
		AND EXISTS (
			SELECT 1 FROM `lesson`
			WHERE `school_id` = NEW.`school_id`
				AND `id` != NEW.`id`
				AND `status` NOT IN ('cancelled')
				AND `ends_at` > NEW.`starts_at` AND `starts_at` < NEW.`ends_at`
				AND (
					`instructor_id` = NEW.`instructor_id`
					OR (`vehicle_id` IS NOT NULL AND NEW.`vehicle_id` IS NOT NULL AND `vehicle_id` = NEW.`vehicle_id`)
				)
		);
END;
