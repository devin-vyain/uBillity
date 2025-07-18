from django.db import models

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
    ('subscription', 'Subscription'),
    ('utility', 'Utility'),
]

class Bill(models.Model):
    name = models.CharField(max_length=30)
    description = models.CharField(max_length=200, blank=True, null=True)
    amount=models.FloatField()
    type=models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='liability')
    category=models.CharField(max_length=20, choices=TRANSACTION_CATEGORIES, blank=True, null=True)
    due_date=models.DateField()
    reconciled=models.BooleanField(default="False")

    def __str__(self):
        return self.name