from rest_framework import serializers
from .models import Bill
from .models import TRANSACTION_CATEGORIES
from .models import TRANSACTION_TYPES

class BillSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=30)
    description = serializers.CharField(
        max_length=200, allow_blank=True, allow_null=True, required=False
    )
    amount = serializers.FloatField()
    type = serializers.ChoiceField(
        choices=TRANSACTION_TYPES,
        required=True
    )
    category = serializers.ChoiceField(
        choices=TRANSACTION_CATEGORIES,
        allow_blank=True,
        allow_null=True,
        required=False
    )
    due_date = serializers.DateField()
    reconciled = serializers.BooleanField(default="False")

    class Meta:
        model = Bill
        fields = ['id', 'name', 'description', 'amount', 'type', 'category', 'due_date', 'reconciled']
