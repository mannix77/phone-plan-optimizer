Feature: MVNO coverage
  The comparison covers the major MVNOs and prepaid brands, not just the
  big three's own prepaid arms.

  Background:
    Given 1 line with no new devices
    And MVNOs are included

  Scenario: US Mobile's unlimited starter is priced
    When the scenarios are computed
    Then the "US Mobile Unlimited Starter" rows have a 24-month plan cost of 600.00

  Scenario: Straight Talk's Silver unlimited is priced
    When the scenarios are computed
    Then the "Straight Talk Silver Unlimited" rows have a 24-month plan cost of 1080.00

  Scenario: Tello rides T-Mobile's MVNO priority tier
    When the scenarios are computed
    Then the "Tello Tello Unlimited" rows carry QCI 7

  Scenario: The catalog covers at least ten MVNO plans
    Then the data includes at least 10 MVNO plans
