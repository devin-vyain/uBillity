from django.db import migrations


def populate_memberships(apps, schema_editor):
    Household = apps.get_model('app', 'Household')
    HouseholdMembership = apps.get_model('app', 'HouseholdMembership')

    for household in Household.objects.all():
        for index, user in enumerate(household.members.all()):
            HouseholdMembership.objects.get_or_create(
                user=user,
                household=household,
                defaults={'is_default': index == 0},
            )


def reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0022_household_membership'),
    ]

    operations = [
        migrations.RunPython(populate_memberships, reverse),
    ]