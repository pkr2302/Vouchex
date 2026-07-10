<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EwayBill extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'invoice_id',
        'ewb_no',
        'ewb_date',
        'valid_upto',
        'status',
        'supply_type',
        'sub_supply_type',
        'document_type',
        'transport_mode',
        'vehicle_no',
        'transporter_name',
        'transporter_gstin',
        'distance_km',
        'from_pincode',
        'to_pincode',
        'api_error',
        'request_payload',
        'response_payload',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'ewb_date' => 'datetime',
            'valid_upto' => 'datetime',
            'request_payload' => 'array',
            'response_payload' => 'array',
            'distance_km' => 'integer',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
