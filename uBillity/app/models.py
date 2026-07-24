from django.db import models
from django.conf import settings

TRANSACTION_TYPES = [
    ('asset', 'Asset'),
    ('expense', 'Expense'),
    ('income', 'Income'),
    ('liability', 'Liability'),
]

TRANSACTION_CATEGORIES = [
    ('healthcare', 'Healthcare'),
    ('loan', 'Loan'),
    ('misc', 'Miscellaneous'),
    ('recreation', 'Recreation'),
    ('investment', 'Investment'),
    ('subscription', 'Subscription'),
    ('utility', 'Utility'),
]

RECURRENCE_CHOICES = [
        ('none', 'One Time'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Biweekly'),
        ('monthly', 'Monthly'),
        ('bimonthly', 'Bimonthly'),
        ('annually', 'Annually'),
    ]

class Household(models.Model):
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='households')

class BillQuerySet(models.QuerySet):
    def visible_to(self, user):
        return self.filter(household__members=user)

class Bill(models.Model):
    objects = BillQuerySet.as_manager()

    household = models.ForeignKey(
        'Household',
        on_delete=models.CASCADE,
        related_name='bills',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='bills_created',
    )
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=200, blank=True, null=True)
    amount=models.FloatField()
    type=models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='liability')
    category=models.CharField(max_length=20, choices=TRANSACTION_CATEGORIES, blank=True, null=True)
    due_date=models.DateField()
    reconciled=models.BooleanField(default="False")
    recurrence = models.CharField(max_length=10, choices=RECURRENCE_CHOICES, default='none')
    recurrence_id = models.UUIDField(null=True, blank=True, editable=False)
    household = models.ForeignKey(Household, on_delete=models.CASCADE, null=True, related_name='records')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.name