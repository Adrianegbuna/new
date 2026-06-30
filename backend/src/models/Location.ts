import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('countries')
@Index(['name'])
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100, unique: true })
  name: string;

  @Column('varchar', { length: 5, nullable: true })
  code: string; // e.g., 'NG' for Nigeria

  @Column('varchar', { length: 50, nullable: true })
  flag: string; // Emoji flag

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('cities')
@Index(['name'])
@Index(['countryId'])
@Index(['countryId', 'name'])
export class City {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('uuid')
  countryId: string;

  @Column('varchar', { length: 100, nullable: true })
  state: string; // State/Province name (if applicable)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
