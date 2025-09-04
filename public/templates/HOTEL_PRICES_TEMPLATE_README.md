# Hotel Prices Import Template Guide

## File Format
- **Supported formats**: CSV (.csv) or Excel (.xlsx, .xls)
- **Template file**: `hotel-prices-template.csv`

## Required Columns

| Column Name | Description | Example Values | Required |
|------------|-------------|----------------|----------|
| **Board** | Meal plan type | RO, BB, HB, FB, AI | Yes |
| **Room Type** | Type of room | Standard, Deluxe, Suite, Family | Yes |
| **From Date** | Start date of price period | 2025-01-01 | Yes |
| **Till Date** | End date of price period | 2025-01-31 | Yes |
| **Single** | Price for single occupancy (EUR) | 100 | Yes |
| **Double** | Price for double occupancy (EUR) | 150 | Yes |
| **Extra Bed** | Price for extra bed (EUR) | 30 | No |
| **Paying Kids Age** | Age range for paying children | 0-6, 7-12 | No |
| **Payment Kids** | Price for children (EUR) | 0, 10, 20 | No |

## Board Types (Meal Plans)
- **RO** - Room Only (no meals)
- **BB** - Bed & Breakfast
- **HB** - Half Board (breakfast + dinner)
- **FB** - Full Board (all meals)
- **AI** - All Inclusive

## Important Notes

1. **Date Format**: Use YYYY-MM-DD format (e.g., 2025-01-15)
2. **Prices**: Enter numbers only, no currency symbols (prices are in EUR)
3. **Paying Kids Age**: Use format "min-max" (e.g., "0-6" or "7-12")
4. **Empty values**: 
   - Extra Bed, Paying Kids Age, and Payment Kids can be left empty
   - Single and Double prices must have values (at least one > 0)

5. **Data Validation**:
   - Dates must be valid and From Date must be before Till Date
   - At least one price (Single or Double) must be greater than 0
   - Board types will be converted to uppercase automatically

## Example Data

```csv
Board,Room Type,From Date,Till Date,Single,Double,Extra Bed,Paying Kids Age,Payment Kids
RO,Standard,2025-01-01,2025-01-31,100,150,30,0-6,0
BB,Deluxe,2025-02-01,2025-02-28,170,220,45,0-6,10
HB,Suite,2025-03-01,2025-03-31,250,350,60,0-6,20
```

## Upload Instructions

1. Download the template file: `hotel-prices-template.csv`
2. Fill in your hotel prices following the format above
3. Save the file as CSV or Excel format
4. In the Hotel Management system:
   - Navigate to your hotel's edit page
   - Go to the "Pricing" tab
   - Click "Import from Excel/CSV"
   - Select your file and upload

## Tips

- Group prices by date ranges and room types for easier management
- Consider seasonal pricing (high/low season)
- Keep a backup of your price files for future reference
- The import will REPLACE all existing prices for the hotel

## Troubleshooting

- **"No valid price entries found"**: Check that Single or Double prices are > 0
- **"Invalid date format"**: Ensure dates are in YYYY-MM-DD format
- **File not uploading**: Verify file is .csv, .xlsx, or .xls format