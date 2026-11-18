<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('relationship_stats', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('total_hugs')->default(0);
            $table->string('last_action_by')->nullable();
            $table->timestamp('daily_gift_unlocked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relationship_stats');
    }
};
