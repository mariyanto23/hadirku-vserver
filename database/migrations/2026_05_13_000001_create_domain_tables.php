<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 50)->unique();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nis', 50)->unique();
            $table->string('name');
            $table->uuid('class_id')->nullable();
            $table->text('photo_url')->nullable();
            $table->boolean('has_embedding')->default(false);
            $table->timestamps();

            $table->foreign('class_id')->references('id')->on('classes')->nullOnDelete();
        });

        Schema::create('face_descriptors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->json('descriptor');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->index(['student_id', 'created_at']);
        });

        Schema::create('attendance_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->date('date');
            $table->time('time');
            $table->string('status', 30);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->unique(['student_id', 'date']);
            $table->index('date');
        });

        Schema::create('leave_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->date('request_date');
            $table->string('leave_type', 20);
            $table->text('reason');
            $table->string('status', 20)->default('pending');
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->index(['status', 'request_date']);
        });

        Schema::create('holidays', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('date');
            $table->boolean('is_recurring')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->index('date');
        });

        Schema::create('app_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key', 100)->unique();
            $table->json('value');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('role', 20);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['user_id', 'role']);
        });

        Schema::create('student_user_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->uuid('student_id')->unique();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
        });

        Schema::create('parent_student_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('parent_user_id');
            $table->uuid('student_id');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('parent_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
            $table->unique(['parent_user_id', 'student_id']);
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('parent_student_links');
        Schema::dropIfExists('student_user_links');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('holidays');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('attendance_records');
        Schema::dropIfExists('face_descriptors');
        Schema::dropIfExists('students');
        Schema::dropIfExists('classes');
    }
};
