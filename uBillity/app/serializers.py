from rest_framework import serializers
from .models import Bill
from .models import TRANSACTION_CATEGORIES
from .models import TRANSACTION_TYPES
from .models import RECURRENCE_CHOICES

class BillSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=50)
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
    recurrence = serializers.ChoiceField(
        choices=RECURRENCE_CHOICES,
        allow_blank=False,
        allow_null=False,
        required=True
    )
    recurrence_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Bill
        fields = ['id', 'name', 'description', 'amount', 'type', 'category', 'due_date', 'reconciled', 'recurrence', 'recurrence_id']
