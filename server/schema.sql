CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`program` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`owner`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_owner_time` ON `audits` (`owner`,`created_at`);--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`program` text NOT NULL,
	`achieved` integer NOT NULL,
	`scores` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`owner`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `competency_owner_program` ON `competencies` (`owner`,`program`);--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`program` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`owner`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrol_owner_program` ON `enrolments` (`owner`,`program`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`program` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`owner`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_owner` ON `events` (`owner`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`program` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`scores` text,
	`feedback` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`token` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `workspaces`(`owner`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_owner_program` ON `submissions` (`owner`,`program`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`owner` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'learner' NOT NULL,
	`created_at` text NOT NULL
);
