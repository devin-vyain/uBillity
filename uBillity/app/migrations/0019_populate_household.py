from django.db import migrations


def create_household_and_assign(apps, schema_editor):
    Household = apps.get_model('app', 'Household')
    Bill = apps.get_model('app', 'Bill')
    User = apps.get_model('auth', 'User')

    household, _ = Household.objects.get_or_create(name='Household')

    household.members.add(*User.objects.all())

    Bill.objects.all().update(household=household)


def reverse(apps, schema_editor):
    # optional: what to do if this migration is unapplied
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0018_bill_created_by_bill_household'), 
    ]

    operations = [
        migrations.RunPython(create_household_and_assign, reverse),
    ]