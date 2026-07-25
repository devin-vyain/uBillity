from rest_framework import serializers
from .models import Bill, Household, HouseholdMembership
from .models import TRANSACTION_CATEGORIES, TRANSACTION_TYPES, RECURRENCE_CHOICES


class HouseholdSerializer(serializers.ModelSerializer):
    is_default = serializers.SerializerMethodField()

    class Meta:
        model = Household
        fields = ['id', 'name', 'is_default']

    def get_is_default(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return HouseholdMembership.objects.filter(
            user=request.user, household=obj, is_default=True
        ).exists()


class BillSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=50)
    description = serializers.CharField(max_length=200, allow_blank=True, allow_null=True, required=False)
    amount = serializers.FloatField()
    type = serializers.ChoiceField(choices=TRANSACTION_TYPES, required=True)
    category = serializers.ChoiceField(choices=TRANSACTION_CATEGORIES, allow_blank=True, allow_null=True, required=False)
    due_date = serializers.DateField()
    reconciled = serializers.BooleanField(default="False")
    recurrence = serializers.ChoiceField(choices=RECURRENCE_CHOICES, allow_blank=False, allow_null=False, required=True)
    recurrence_id = serializers.UUIDField(read_only=True)
    household = serializers.PrimaryKeyRelatedField(queryset=Household.objects.none(), required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            self.fields['household'].queryset = request.user.households.all()

    class Meta:
        model = Bill
        fields = ['id', 'name', 'description', 'amount', 'type', 'category', 'due_date', 'reconciled', 'recurrence', 'recurrence_id', 'household']