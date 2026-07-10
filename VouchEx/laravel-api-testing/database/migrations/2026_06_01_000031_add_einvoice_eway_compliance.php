<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('irn', 64)->nullable()->after('status');
            $table->string('ack_no', 32)->nullable()->after('irn');
            $table->dateTime('ack_date')->nullable()->after('ack_no');
            $table->text('einvoice_qr')->nullable()->after('ack_date');
            $table->string('einvoice_status', 24)->default('none')->after('einvoice_qr');
            $table->text('einvoice_error')->nullable()->after('einvoice_status');
            $table->dateTime('einvoice_generated_at')->nullable()->after('einvoice_error');
            $table->dateTime('einvoice_cancelled_at')->nullable()->after('einvoice_generated_at');
        });

        Schema::create('eway_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->string('ewb_no', 20)->nullable();
            $table->dateTime('ewb_date')->nullable();
            $table->dateTime('valid_upto')->nullable();
            $table->string('status', 24)->default('draft');
            $table->string('supply_type', 32)->nullable();
            $table->string('sub_supply_type', 32)->nullable();
            $table->string('document_type', 32)->default('Tax Invoice');
            $table->string('transport_mode', 16)->nullable();
            $table->string('vehicle_no', 32)->nullable();
            $table->string('transporter_name')->nullable();
            $table->string('transporter_gstin', 15)->nullable();
            $table->unsignedInteger('distance_km')->nullable();
            $table->string('from_pincode', 10)->nullable();
            $table->string('to_pincode', 10)->nullable();
            $table->text('api_error')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_id', 'invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eway_bills');

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn([
                'irn',
                'ack_no',
                'ack_date',
                'einvoice_qr',
                'einvoice_status',
                'einvoice_error',
                'einvoice_generated_at',
                'einvoice_cancelled_at',
            ]);
        });
    }
};
