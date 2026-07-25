from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Household, HouseholdMembership


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_household(sender, instance, created, **kwargs):
    if created:
        household = Household.objects.create(name=f"{instance.username}'s Household")
        HouseholdMembership.objects.create(
            user=instance,
            household=household,
            is_default=True,
        )